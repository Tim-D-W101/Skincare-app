import type { copy } from '@/constants/copy';

/**
 * The scan pipeline's names and timings. The attribute and reason lists
 * match the analyze-scan Edge Function (supabase/functions/analyze-scan/prompt.ts).
 */

/** Scored attributes, in display order. Each has a label in copy.results.attributes. */
export const ATTRIBUTE_KEYS = [
  'clarity',
  'texture',
  'pores',
  'hydration',
  'redness',
  'evenness',
  'firmness',
] as const satisfies readonly (keyof typeof copy.results.attributes)[];

/** The private storage bucket for scan photos: {user_id}/{scan_id}.jpg */
export const SCANS_BUCKET = 'scans';

export const ANALYZE_SCAN_FUNCTION = 'analyze-scan';

/** How often to check the scan while Realtime isn't connected. */
export const SCAN_POLL_INTERVAL_MS = 3_000;
/** A slower check while Realtime is connected, in case an update goes missing. */
export const SCAN_SAFETY_POLL_INTERVAL_MS = 10_000;

/** When the waiting screen says it's still working. */
export const SCAN_STILL_WORKING_MS = 30_000;
/** When the waiting screen offers to try again or go back. */
export const SCAN_SLOW_MS = 60_000;
