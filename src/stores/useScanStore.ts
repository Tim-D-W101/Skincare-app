import { create } from 'zustand';

import type { CapturedPhoto } from '@/types/scan';

interface ScanState {
  /** The photo on the confirm screen, or the confirmed one waiting to be sent. */
  capture: CapturedPhoto | null;
  /** True once the user chose "Use this". Nothing is uploaded before then. */
  confirmed: boolean;

  setCapture: (capture: CapturedPhoto) => void;
  confirmCapture: () => void;
  discardCapture: () => void;
}

export const useScanStore = create<ScanState>()((set) => ({
  capture: null,
  confirmed: false,

  setCapture: (capture) => set({ capture, confirmed: false }),
  confirmCapture: () => set((state) => ({ confirmed: state.capture !== null })),
  discardCapture: () => set({ capture: null, confirmed: false }),
}));
