import { create } from 'zustand';

import { PHOTO_URL_RENEW_MARGIN_MS } from '@/constants/progress';
import { logInDevelopment } from '@/lib/errors';
import { fetchScanHistory, signPhotoUrls, type ScanRecord, type SignedPhoto } from '@/lib/progress';
import { useAuthStore } from '@/stores/useAuthStore';

interface ProgressState {
  /** 'loading' and 'error' only describe the first load; a refresh keeps what's shown. */
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Completed scans, oldest first. */
  records: ScanRecord[];
  /** A refresh failed while older data is on screen. */
  refreshFailed: boolean;
  /** Signed photo links by storage path, held in memory for the session. */
  photos: Record<string, SignedPhoto>;
  /** Paths whose photo couldn't be signed. The thumbnail shows a placeholder. */
  photoErrors: Record<string, true>;

  /** Loads the history, or refreshes it. Safe to call on every visit. */
  load: () => Promise<void>;
  /** Signs links for any of these photos that don't have a fresh one. */
  loadPhotos: (paths: string[]) => Promise<void>;
  /** Replaces a link that stopped working, most likely because it expired. */
  renewPhoto: (path: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: 'idle',
  records: [],
  refreshFailed: false,
  photos: {},
  photoErrors: {},
} as const satisfies Pick<
  ProgressState,
  'status' | 'records' | 'refreshFailed' | 'photos' | 'photoErrors'
>;

// Outside the store: bookkeeping no screen renders.
let loading: Promise<void> | null = null;
const signing = new Set<string>();
/** Bumped on reset, so a request that started for the previous user is dropped. */
let generation = 0;

function isFresh(photo: SignedPhoto | undefined): boolean {
  return photo !== undefined && photo.expiresAt - PHOTO_URL_RENEW_MARGIN_MS > Date.now();
}

export const useProgressStore = create<ProgressState>()((set, get) => {
  const sign = async (paths: string[]) => {
    const wanted = paths.filter((path) => !signing.has(path));
    if (wanted.length === 0) return;
    wanted.forEach((path) => signing.add(path));
    const started = generation;
    try {
      const signed = await signPhotoUrls(wanted);
      if (started !== generation) return;
      const failed = wanted.filter((path) => !signed[path]);
      set((state) => {
        const photoErrors = { ...state.photoErrors };
        for (const path of wanted) delete photoErrors[path];
        for (const path of failed) photoErrors[path] = true;
        return { photos: { ...state.photos, ...signed }, photoErrors };
      });
    } catch (error: unknown) {
      logInDevelopment('Could not sign scan photo links', error);
      if (started !== generation) return;
      set((state) => {
        const photoErrors = { ...state.photoErrors };
        for (const path of wanted) photoErrors[path] = true;
        return { photoErrors };
      });
    } finally {
      wanted.forEach((path) => signing.delete(path));
    }
  };

  return {
    ...initialState,

    load: () => {
      if (loading) return loading;
      const started = generation;
      if (get().records.length === 0) set({ status: 'loading' });
      const request = (async () => {
        try {
          const records = await fetchScanHistory();
          if (started !== generation) return;
          set({ status: 'ready', records, refreshFailed: false });
        } catch (error: unknown) {
          logInDevelopment('Could not load the scan history', error);
          if (started !== generation) return;
          if (get().records.length === 0) set({ status: 'error' });
          else set({ refreshFailed: true });
        }
      })();
      loading = request;
      void request.finally(() => {
        // A reset may have started a newer request meanwhile; leave that one alone.
        if (loading === request) loading = null;
      });
      return request;
    },

    loadPhotos: async (paths) => {
      const { photos } = get();
      await sign(paths.filter((path) => !isFresh(photos[path])));
    },

    renewPhoto: async (path) => {
      await sign([path]);
    },

    reset: () => {
      generation += 1;
      loading = null;
      signing.clear();
      set(initialState);
    },
  };
});

// A different user sees none of the previous user's scans or photo links.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useProgressStore.getState().reset();
});
