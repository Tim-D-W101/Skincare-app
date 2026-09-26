import { File, Paths } from 'expo-file-system';

import { logInDevelopment } from '@/lib/errors';
import type { Routine, RoutineChange, RoutineSlot } from '@/types/routine';

/**
 * The routine as last seen, today's ticks and any changes not yet saved,
 * kept in a file in the app's private storage. It lets the routine tab open
 * and work offline, and keeps unsaved ticks across a restart.
 */
export interface StoredRoutineState {
  userId: string;
  routine: Routine | null;
  /** The local day `ticked` belongs to. */
  day: string;
  ticked: string[];
  pending: RoutineChange[];
}

const FILE_NAME = 'routine-state.json';

function stateFile(): File {
  return new File(Paths.document, FILE_NAME);
}

function isSlot(value: unknown): value is RoutineSlot {
  return value === 'morning' || value === 'evening';
}

function isChange(value: unknown): value is RoutineChange {
  if (typeof value !== 'object' || value === null) return false;
  const change: Partial<Record<keyof RoutineChange, unknown>> = value;
  return (
    (change.kind === 'tick' || change.kind === 'untick') &&
    typeof change.routineId === 'string' &&
    typeof change.day === 'string' &&
    isSlot(change.slot) &&
    typeof change.stepKey === 'string'
  );
}

function isRoutine(value: unknown): value is Routine {
  if (typeof value !== 'object' || value === null) return false;
  const routine: Partial<Record<keyof Routine, unknown>> = value;
  return typeof routine.id === 'string' && Array.isArray(routine.steps);
}

/** Reads the saved state for this user, or null if there is none (or it belongs to someone else). */
export async function readRoutineState(userId: string): Promise<StoredRoutineState | null> {
  try {
    const file = stateFile();
    if (!file.exists) return null;
    const parsed: unknown = JSON.parse(await file.text());
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored: Partial<Record<keyof StoredRoutineState, unknown>> = parsed;
    if (stored.userId !== userId || typeof stored.day !== 'string') return null;
    return {
      userId,
      routine: isRoutine(stored.routine) ? stored.routine : null,
      day: stored.day,
      ticked: Array.isArray(stored.ticked)
        ? stored.ticked.filter((key): key is string => typeof key === 'string')
        : [],
      pending: Array.isArray(stored.pending) ? stored.pending.filter(isChange) : [],
    };
  } catch (error: unknown) {
    // A damaged file is dropped: the server has everything except unsaved ticks.
    logInDevelopment('Could not read the saved routine', error);
    return null;
  }
}

export function writeRoutineState(state: StoredRoutineState): void {
  try {
    const file = stateFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(state));
  } catch (error: unknown) {
    // The tab keeps working from memory; only an offline restart would lose ticks.
    logInDevelopment('Could not save the routine on the phone', error);
  }
}

/** Removes the saved state, when the user signs out or changes. */
export function clearRoutineState(): void {
  try {
    const file = stateFile();
    if (file.exists) file.delete();
  } catch (error: unknown) {
    logInDevelopment('Could not clear the saved routine', error);
  }
}
