import { create } from 'zustand';

import { GHOST_URL_TTL_SECONDS } from '@/constants/capture';
import { logInDevelopment } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CapturedPhoto } from '@/types/scan';

/** The previous scan photo shown faintly over the camera, if there is one. */
export type GhostState =
  | { status: 'idle' }
  | { status: 'loading' }
  /** No completed scan yet: this is a first scan. */
  | { status: 'none' }
  | { status: 'ready'; url: string; expiresAt: number }
  | { status: 'failed' };

interface ScanState {
  /** The photo on the confirm screen, or the confirmed one waiting to be sent. */
  capture: CapturedPhoto | null;
  /** True once the user chose "Use this". Nothing is uploaded before then. */
  confirmed: boolean;
  ghost: GhostState;

  setCapture: (capture: CapturedPhoto) => void;
  confirmCapture: () => void;
  discardCapture: () => void;
  /** Finds the latest completed scan and signs a short-lived URL for its photo. */
  loadGhost: () => Promise<void>;
  reset: () => void;
}

const SCANS_BUCKET = 'scans';

const initialState = {
  capture: null,
  confirmed: false,
  ghost: { status: 'idle' },
} as const satisfies Pick<ScanState, 'capture' | 'confirmed' | 'ghost'>;

export const useScanStore = create<ScanState>()((set, get) => ({
  ...initialState,

  setCapture: (capture) => set({ capture, confirmed: false }),
  confirmCapture: () => set((state) => ({ confirmed: state.capture !== null })),
  discardCapture: () => set({ capture: null, confirmed: false }),

  loadGhost: async () => {
    const { ghost } = get();
    if (ghost.status === 'loading') return;
    if (ghost.status === 'ready' && ghost.expiresAt > Date.now()) return;

    set({ ghost: { status: 'loading' } });
    try {
      // Row-level security limits this to the signed-in user's own scans.
      const { data: scan, error } = await supabase
        .from('scans')
        .select('image_path')
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!scan) {
        set({ ghost: { status: 'none' } });
        return;
      }

      const { data: signed, error: signError } = await supabase.storage
        .from(SCANS_BUCKET)
        .createSignedUrl(scan.image_path, GHOST_URL_TTL_SECONDS);
      if (signError) throw signError;
      set({
        ghost: {
          status: 'ready',
          url: signed.signedUrl,
          expiresAt: Date.now() + GHOST_URL_TTL_SECONDS * 1000,
        },
      });
    } catch (error: unknown) {
      logInDevelopment('Could not load the previous scan photo', error);
      set({ ghost: { status: 'failed' } });
    }
  },

  reset: () => set(initialState),
}));

// Photos belong to one user. When the signed-in user changes (sign-out,
// account deletion, signing in elsewhere), forget everything held here.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useScanStore.getState().reset();
});
