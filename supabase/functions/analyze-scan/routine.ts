import {
  ROUTINE_MAX_STEPS,
  ROUTINE_MIN_STEPS,
  ROUTINE_STEP_KEYS,
  SUNSCREEN_STEP,
  type RoutineStepKey,
} from './prompt.ts';

export type RoutineSlot = 'morning' | 'evening';

/** One step as the model wrote it. */
export interface ModelStep {
  key: RoutineStepKey;
  title: string;
  why: string;
}

/** One step as stored in routines.steps and shown in the app. */
export interface RoutineStep extends ModelStep {
  slot: RoutineSlot;
}

export type RoutineResult = { ok: true; steps: RoutineStep[] } | { ok: false; problem: string };

const ORDER = new Map<RoutineStepKey, number>(ROUTINE_STEP_KEYS.map((key, index) => [key, index]));

/** Kept when a part has to be shortened. */
const ESSENTIAL = new Set<RoutineStepKey>(['cleanse', 'moisturise', 'sunscreen']);

function orderOf(key: RoutineStepKey): number {
  return ORDER.get(key) ?? ROUTINE_STEP_KEYS.length;
}

/**
 * Puts one part of the routine right, whatever the model wrote: each key
 * once, in application order, sunscreen only in the morning and always last
 * there, makeup removal only in the evening, and no more than the maximum
 * number of steps.
 */
function tidy(steps: ModelStep[], slot: RoutineSlot): ModelStep[] {
  const seen = new Set<RoutineStepKey>();
  const kept = steps
    .filter((step) => {
      if (seen.has(step.key)) return false;
      seen.add(step.key);
      if (slot === 'evening' && step.key === 'sunscreen') return false;
      if (slot === 'morning' && step.key === 'makeup_removal') return false;
      return true;
    })
    .map((step) => ({ key: step.key, title: step.title.trim(), why: step.why.trim() }))
    .sort((a, b) => orderOf(a.key) - orderOf(b.key));

  // Sunscreen closes the morning, without exception. It sorts last on its own.
  if (slot === 'morning' && !seen.has('sunscreen')) kept.push({ ...SUNSCREEN_STEP });

  while (kept.length > ROUTINE_MAX_STEPS) {
    const index = kept.findLastIndex((step) => !ESSENTIAL.has(step.key));
    if (index < 0) break;
    kept.splice(index, 1);
  }
  return kept;
}

/**
 * The routine to store: morning steps then evening steps, each tagged with
 * its slot. A part left with too few steps makes the reply unusable, so the
 * caller retries.
 */
export function buildRoutine(routine: { morning: ModelStep[]; evening: ModelStep[] }): RoutineResult {
  const morning = tidy(routine.morning, 'morning');
  const evening = tidy(routine.evening, 'evening');
  if (morning.length < ROUTINE_MIN_STEPS || evening.length < ROUTINE_MIN_STEPS) {
    return {
      ok: false,
      problem: `routine had too few steps (${morning.length} morning, ${evening.length} evening)`,
    };
  }
  return {
    ok: true,
    steps: [
      ...morning.map((step) => ({ ...step, slot: 'morning' as const })),
      ...evening.map((step) => ({ ...step, slot: 'evening' as const })),
    ],
  };
}
