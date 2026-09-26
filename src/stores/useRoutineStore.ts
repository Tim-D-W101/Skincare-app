import { addNetworkStateListener } from 'expo-network';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { localDayKey } from '@/lib/dates';
import { isConnectionFailure, logInDevelopment } from '@/lib/errors';
import { fetchActiveRoutine, fetchTicks, saveChange, tickKey } from '@/lib/routine';
import { clearRoutineState, readRoutineState, writeRoutineState } from '@/lib/routineStorage';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Routine, RoutineChange, RoutineStep } from '@/types/routine';

/** Shown under the ring: saved on the phone for now, or a tick that didn't save. */
export type RoutineNotice = 'offline' | 'failed' | null;

interface RoutineState {
  /** 'loading' and 'error' only describe a first load with nothing to show. */
  status: 'idle' | 'loading' | 'ready' | 'error';
  routine: Routine | null;
  /** The local day `ticked` belongs to, as YYYY-MM-DD. */
  day: string;
  /** Today's ticked steps, by tick key, including changes not yet saved. */
  ticked: Record<string, true>;
  /** Changes made on the phone and not yet saved, oldest first. */
  pending: RoutineChange[];
  notice: RoutineNotice;

  /** Shows what's saved on the phone at once, then brings it up to date from the server. */
  load: () => Promise<void>;
  /** Ticks or unticks a step straight away, then saves it (now, or when back online). */
  toggle: (step: RoutineStep) => void;
  /** Saves pending changes. Safe to call at any time; runs one at a time. */
  sync: () => Promise<void>;
  /** Starts a fresh day if local midnight has passed. */
  checkDay: () => void;
  reset: () => void;
}

const initialState = {
  status: 'idle',
  routine: null,
  day: localDayKey(),
  ticked: {},
  pending: [],
  notice: null,
} as const satisfies Pick<
  RoutineState,
  'status' | 'routine' | 'day' | 'ticked' | 'pending' | 'notice'
>;

// Outside the store: bookkeeping no screen renders.
let hydratedFor: string | null = null;
let syncing: Promise<void> | null = null;
let watching = false;
/** Bumped on reset, so work started for the previous user is dropped. */
let generation = 0;

function sameStep(a: RoutineChange, b: RoutineChange): boolean {
  return a.day === b.day && a.slot === b.slot && a.stepKey === b.stepKey;
}

/** Today's ticks: the server's, with the unsaved changes on top. */
function applyPending(serverTicks: string[], pending: RoutineChange[], day: string) {
  const ticked: Record<string, true> = {};
  for (const key of serverTicks) ticked[key] = true;
  for (const change of pending) {
    if (change.day !== day) continue;
    const key = tickKey(change.slot, change.stepKey);
    if (change.kind === 'tick') ticked[key] = true;
    else delete ticked[key];
  }
  return ticked;
}

export const useRoutineStore = create<RoutineState>()((set, get) => {
  const persist = () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const { routine, day, ticked, pending } = get();
    writeRoutineState({ userId, routine, day, ticked: Object.keys(ticked), pending });
  };

  /** Saves ticks made offline the moment the phone is back online, and on return to the app. */
  const watch = () => {
    if (watching) return;
    watching = true;
    addNetworkStateListener((network) => {
      if (network.isConnected && network.isInternetReachable !== false) void get().sync();
    });
    AppState.addEventListener('change', (appState) => {
      if (appState !== 'active') return;
      get().checkDay();
      void get().sync();
    });
  };

  return {
    ...initialState,

    load: async () => {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      const started = generation;
      watch();

      if (hydratedFor !== userId) {
        hydratedFor = userId;
        const stored = await readRoutineState(userId);
        if (started !== generation) return;
        if (stored) {
          const today = localDayKey();
          set({
            status: 'ready',
            routine: stored.routine,
            day: today,
            ticked:
              stored.day === today
                ? Object.fromEntries(stored.ticked.map((key) => [key, true as const]))
                : applyPending([], stored.pending, today),
            pending: stored.pending,
          });
        }
      }

      if (get().status !== 'ready') set({ status: 'loading' });
      try {
        const today = localDayKey();
        const routine = await fetchActiveRoutine();
        const serverTicks = routine ? await fetchTicks(today) : [];
        if (started !== generation) return;
        set({
          status: 'ready',
          routine,
          day: today,
          ticked: applyPending(serverTicks, get().pending, today),
        });
        persist();
        void get().sync();
      } catch (error: unknown) {
        logInDevelopment('Could not load the routine', error);
        if (started !== generation) return;
        // What's on the phone stays on screen; only an empty first load is an error.
        if (get().status !== 'ready') set({ status: 'error' });
        else if (isConnectionFailure(error)) set({ notice: 'offline' });
      }
    },

    toggle: (step) => {
      get().checkDay();
      const { routine, day, ticked, pending } = get();
      if (!routine) return;
      const key = tickKey(step.slot, step.key);
      const change: RoutineChange = {
        kind: ticked[key] ? 'untick' : 'tick',
        routineId: routine.id,
        day,
        slot: step.slot,
        stepKey: step.key,
      };
      const nextTicked = { ...ticked };
      if (change.kind === 'tick') nextTicked[key] = true;
      else delete nextTicked[key];
      set({
        ticked: nextTicked,
        // Only the latest change to a step matters; both kinds are safe to repeat.
        pending: [...pending.filter((queued) => !sameStep(queued, change)), change],
        notice: null,
      });
      persist();
      void get().sync();
    },

    sync: () => {
      if (syncing) return syncing;
      const run = async () => {
        const started = generation;
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        while (started === generation) {
          const change = get().pending[0];
          if (!change) break;
          try {
            await saveChange(change, userId);
            if (started !== generation) return;
            set({ pending: get().pending.filter((queued) => queued !== change) });
            if (get().notice === 'offline') set({ notice: null });
          } catch (error: unknown) {
            if (started !== generation) return;
            if (isConnectionFailure(error)) {
              // Kept for later: it goes through when the connection is back.
              set({ notice: 'offline' });
              break;
            }
            // The server turned it down, so the screen goes back to how it was,
            // unless the step has been changed again since.
            logInDevelopment('A routine change was not saved', error);
            const pending = get().pending.filter((queued) => queued !== change);
            const superseded = pending.some((queued) => sameStep(queued, change));
            const ticked = { ...get().ticked };
            if (!superseded && change.day === get().day) {
              const key = tickKey(change.slot, change.stepKey);
              if (change.kind === 'tick') delete ticked[key];
              else ticked[key] = true;
            }
            set({ pending, ticked, notice: 'failed' });
          }
        }
        persist();
      };
      const request = run();
      syncing = request;
      void request.finally(() => {
        if (syncing === request) syncing = null;
      });
      return request;
    },

    checkDay: () => {
      const today = localDayKey();
      const { day, pending } = get();
      if (today === day) return;
      // A new day starts empty. Yesterday's unsaved changes keep their own day.
      set({ day: today, ticked: applyPending([], pending, today) });
      persist();
      void get().load();
    },

    reset: () => {
      generation += 1;
      hydratedFor = null;
      syncing = null;
      clearRoutineState();
      set({ ...initialState, day: localDayKey() });
    },
  };
});

// A different user never sees the previous user's routine or ticks.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useRoutineStore.getState().reset();
});
