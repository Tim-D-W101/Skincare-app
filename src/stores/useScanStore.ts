import { create } from 'zustand';

import { GHOST_URL_TTL_SECONDS } from '@/constants/capture';
import { copy } from '@/constants/copy';
import { SCANS_BUCKET } from '@/constants/scan';
import { logInDevelopment, scanErrorMessage, toUserMessage } from '@/lib/errors';
import { deleteLocalFile } from '@/lib/photos';
import {
  fetchScanResult,
  fetchScanUpdate,
  ScanSubmitError,
  startAnalysis,
  submitScan,
  type ScanUpdate,
  type StartResult,
} from '@/lib/scan';
import { watchScan } from '@/lib/scanWatcher';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CapturedPhoto, RejectReason, ScanResult } from '@/types/scan';

/** The previous scan photo shown faintly over the camera, if there is one. */
export type GhostState =
  | { status: 'idle' }
  | { status: 'loading' }
  /** No completed scan yet: this is a first scan. */
  | { status: 'none' }
  | { status: 'ready'; url: string; expiresAt: number }
  | { status: 'failed' };

/** Where the scan being analysed has got to. Only moves forward. */
export type AnalysisState =
  | { stage: 'idle' }
  /** Sending the photo and creating the scan row. */
  | { stage: 'uploading'; startedAt: number }
  /** Saved, waiting for the Edge Function to pick it up. */
  | { stage: 'queued'; scanId: string; startedAt: number }
  | { stage: 'processing'; scanId: string; startedAt: number }
  | { stage: 'complete'; scanId: string; result: ScanResult }
  /** The photo couldn't be scored. The reason is null if it isn't one the app knows. */
  | { stage: 'rejected'; scanId: string; reason: RejectReason | null }
  | {
      stage: 'failed';
      /** Null when the scan was never saved. */
      scanId: string | null;
      message: string;
      /** The scan row exists but its analysis never started, so a retry reuses it. */
      restartable: boolean;
    };

interface ScanState {
  /** The photo being confirmed or analysed. Lives in the app's private cache. */
  capture: CapturedPhoto | null;
  ghost: GhostState;
  analysis: AnalysisState;

  /** Holds a new photo, deleting the previous one from the cache. */
  setCapture: (capture: CapturedPhoto) => void;
  /** Drops the photo and deletes it from the cache. */
  discardCapture: () => void;
  /** Uploads the photo and starts following its analysis. */
  submitCapture: () => Promise<void>;
  /** Restarts a scan that never started, or submits the photo again as a new scan. */
  retryAnalysis: () => Promise<void>;
  /**
   * The user has left the scan screens: stop following, delete the local
   * photo. Leaves the rest in place, so screens on their way out don't change
   * under the transition. A scan still in progress finishes on the server.
   */
  endScanFlow: () => void;
  /** Finds the latest completed scan and signs a short-lived URL for its photo. */
  loadGhost: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  capture: null,
  ghost: { status: 'idle' },
  analysis: { stage: 'idle' },
} as const satisfies Pick<ScanState, 'capture' | 'ghost' | 'analysis'>;

// Outside the store: neither is state any screen renders.
/** The scan being followed, and how to stop following it. */
let following: { scanId: string; stop: () => void } | null = null;
/** Bumped whenever a submit is superseded, so a finishing upload knows it's stale. */
let submitGeneration = 0;
/** Scans whose results are being fetched, so a repeated 'complete' doesn't fetch twice. */
const loadingResults = new Set<string>();

function stopFollowing(): void {
  following?.stop();
  following = null;
}

function isFollowing(scanId: string): boolean {
  return following?.scanId === scanId;
}

function isRejectReason(value: string | null): value is RejectReason {
  return value !== null && value in copy.scan.rejected.reasons;
}

function submitErrorMessage(error: unknown): string {
  if (!(error instanceof ScanSubmitError)) return toUserMessage(error);
  if (error.stage === 'session') return copy.errors.sessionExpired;
  const message = toUserMessage(error.cause);
  // Connection problems keep their own message; anything else during upload
  // is described as an upload problem.
  return error.stage === 'upload' && message === copy.errors.generic ? copy.errors.upload : message;
}

export const useScanStore = create<ScanState>()((set, get) => {
  const loadResult = async (scanId: string) => {
    if (loadingResults.has(scanId)) return;
    loadingResults.add(scanId);
    try {
      const result = await fetchScanResult(scanId);
      if (!isFollowing(scanId)) return;
      stopFollowing();
      // The ghost resets so next time it shows this newest photo.
      set({ analysis: { stage: 'complete', scanId, result }, ghost: { status: 'idle' } });
      // The free scan is used now; bring the profile up to date.
      const refreshed = await useAuthStore.getState().refreshProfile();
      if (!refreshed.ok) logInDevelopment('Could not refresh the profile', refreshed.message);
    } catch (error: unknown) {
      // The watcher's next check sees 'complete' again and retries.
      logInDevelopment('Could not load the scan result', error);
    } finally {
      loadingResults.delete(scanId);
    }
  };

  const applyUpdate = (scanId: string, update: ScanUpdate) => {
    const { analysis } = get();
    if (!isFollowing(scanId)) return;
    if (
      (analysis.stage !== 'queued' && analysis.stage !== 'processing') ||
      analysis.scanId !== scanId
    ) {
      return;
    }

    switch (update.status) {
      case 'pending':
        return;
      case 'processing':
        if (analysis.stage === 'queued') {
          set({ analysis: { stage: 'processing', scanId, startedAt: analysis.startedAt } });
        }
        return;
      case 'complete':
        void loadResult(scanId);
        return;
      case 'rejected':
        stopFollowing();
        set({
          analysis: {
            stage: 'rejected',
            scanId,
            reason: isRejectReason(update.failureReason) ? update.failureReason : null,
          },
        });
        return;
      case 'failed':
        stopFollowing();
        set({
          analysis: {
            stage: 'failed',
            scanId,
            message: scanErrorMessage(update.failureReason),
            restartable: false,
          },
        });
        return;
    }
  };

  /** Called when the Edge Function responds. Most outcomes arrive through the row instead. */
  const handleStart = async (scanId: string, started: Promise<StartResult>) => {
    const result = await started;
    // ALREADY_PROCESSED: another call got there first, and the row shows its progress.
    if (result.ok || result.code === 'ALREADY_PROCESSED' || !isFollowing(scanId)) return;

    // If the function claimed the scan, the row records how it ended.
    let update: ScanUpdate | null = null;
    try {
      update = await fetchScanUpdate(scanId);
    } catch (error: unknown) {
      logInDevelopment('Could not check the scan after the function failed', error);
    }
    if (!isFollowing(scanId)) return;
    if (update && update.status !== 'pending') {
      applyUpdate(scanId, update);
      return;
    }

    // It never started, so a retry calls the function again for the same scan.
    stopFollowing();
    set({
      analysis: {
        stage: 'failed',
        scanId,
        message: result.code ? scanErrorMessage(result.code) : toUserMessage(result.error),
        restartable: true,
      },
    });
  };

  const follow = (scanId: string, started: Promise<StartResult>) => {
    stopFollowing();
    following = {
      scanId,
      stop: watchScan(scanId, (update) => applyUpdate(scanId, update)),
    };
    void handleStart(scanId, started);
  };

  return {
    ...initialState,

    setCapture: (capture) => {
      const previous = get().capture;
      if (previous && previous.uri !== capture.uri) deleteLocalFile(previous.uri);
      set({ capture });
    },

    discardCapture: () => {
      const { capture } = get();
      if (capture) deleteLocalFile(capture.uri);
      set({ capture: null });
    },

    submitCapture: async () => {
      const { capture } = get();
      if (!capture) return;

      stopFollowing();
      const generation = ++submitGeneration;
      const startedAt = Date.now();
      set({ analysis: { stage: 'uploading', startedAt } });

      try {
        const { scanId, started } = await submitScan(capture.uri, capture.quality);
        // The user left or started again meanwhile. The scan still runs on the server.
        if (generation !== submitGeneration) return;
        set({ analysis: { stage: 'queued', scanId, startedAt } });
        follow(scanId, started);
      } catch (error: unknown) {
        if (generation !== submitGeneration) return;
        logInDevelopment('Could not submit the scan', error);
        set({
          analysis: {
            stage: 'failed',
            scanId: null,
            message: submitErrorMessage(error),
            restartable: false,
          },
        });
      }
    },

    retryAnalysis: async () => {
      const { analysis } = get();
      if (analysis.stage === 'failed' && analysis.restartable && analysis.scanId) {
        const { scanId } = analysis;
        submitGeneration += 1;
        set({ analysis: { stage: 'queued', scanId, startedAt: Date.now() } });
        follow(scanId, startAnalysis(scanId));
        return;
      }
      // A new scan from the same photo. The old one failed or is stuck, and
      // neither used up the free scan.
      await get().submitCapture();
    },

    endScanFlow: () => {
      submitGeneration += 1;
      stopFollowing();
      const { capture } = get();
      if (capture) deleteLocalFile(capture.uri);
    },

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

    reset: () => {
      submitGeneration += 1;
      stopFollowing();
      const { capture } = get();
      if (capture) deleteLocalFile(capture.uri);
      set(initialState);
    },
  };
});

// Photos belong to one user. When the signed-in user changes (sign-out,
// account deletion, signing in elsewhere), forget everything held here.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useScanStore.getState().reset();
});
