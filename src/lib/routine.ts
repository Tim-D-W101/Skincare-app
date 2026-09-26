import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type { Routine, RoutineChange, RoutineSlot, RoutineStep } from '@/types/routine';

/**
 * The app's side of the routine: read the active routine and a day's ticks,
 * and save one tick or untick. Row-level security limits all of it to the
 * signed-in user's own rows.
 */

function isSlot(value: unknown): value is RoutineSlot {
  return value === 'morning' || value === 'evening';
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Reads routines.steps, skipping anything malformed rather than failing the whole routine. */
export function parseSteps(value: Json): RoutineStep[] {
  if (!Array.isArray(value)) return [];
  const steps: RoutineStep[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
    const { key, title, why, slot } = item;
    if (isText(key) && isText(title) && isText(why) && isSlot(slot)) {
      steps.push({ key, title, why, slot });
    }
  }
  return steps;
}

/** A tick's identity within a day. */
export function tickKey(slot: RoutineSlot, stepKey: string): string {
  return `${slot}:${stepKey}`;
}

/** The routine from the latest scan, or null before the first scan. */
export async function fetchActiveRoutine(): Promise<Routine | null> {
  const { data, error } = await supabase
    .from('routines')
    .select('id, steps')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, steps: parseSteps(data.steps) } : null;
}

/** The steps ticked on a local day, as tick keys. */
export async function fetchTicks(day: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('routine_logs')
    .select('slot, step_key')
    .eq('log_date', day);
  if (error) throw error;
  return data.flatMap((row) => (isSlot(row.slot) ? [tickKey(row.slot, row.step_key)] : []));
}

/**
 * Saves one change. Both kinds are safe to repeat: a second tick is ignored
 * by the unique (user, day, slot, step) key, and a second untick deletes
 * nothing.
 */
export async function saveChange(change: RoutineChange, userId: string): Promise<void> {
  if (change.kind === 'tick') {
    const { error } = await supabase.from('routine_logs').upsert(
      {
        user_id: userId,
        routine_id: change.routineId,
        log_date: change.day,
        slot: change.slot,
        step_key: change.stepKey,
      },
      { onConflict: 'user_id,log_date,slot,step_key', ignoreDuplicates: true },
    );
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('routine_logs')
    .delete()
    .eq('log_date', change.day)
    .eq('slot', change.slot)
    .eq('step_key', change.stepKey);
  if (error) throw error;
}
