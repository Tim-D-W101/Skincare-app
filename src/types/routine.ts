export type RoutineSlot = 'morning' | 'evening';

/** One step of a routine, as analyze-scan generated it. */
export interface RoutineStep {
  /** A category such as "cleanse" or "sunscreen". Unique within its slot. */
  key: string;
  title: string;
  why: string;
  slot: RoutineSlot;
}

/** The active routine: the one generated with the latest scan. */
export interface Routine {
  id: string;
  steps: RoutineStep[];
}

/** A tick or an untick made on the phone and not yet saved to the server. */
export interface RoutineChange {
  kind: 'tick' | 'untick';
  routineId: string;
  /** The local day it belongs to, as YYYY-MM-DD. */
  day: string;
  slot: RoutineSlot;
  stepKey: string;
}
