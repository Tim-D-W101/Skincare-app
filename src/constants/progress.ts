import type { AttributeKey } from '@/types/scan';

/** What the progress chart and history show: the overall score or one attribute. */
export type ProgressMetric = 'overall' | AttributeKey;

/**
 * How far a score can drift between two photos of unchanged skin, in points.
 * The chart shades this much either side of the line, so a small wobble isn't
 * read as real change. It matches the ~5 point consistency gate the
 * calibration harness checks; revisit it once real calibration runs exist.
 */
export const SCORE_NOISE_POINTS = 4;

/** The rhythm the app suggests: one scan a week. */
export const SUGGESTED_SCAN_INTERVAL_DAYS = 7;

/** Signed links for scan photos. Short-lived, held in memory, renewed shortly before expiry. */
export const PHOTO_URL_TTL_SECONDS = 600;
export const PHOTO_URL_RENEW_MARGIN_MS = 60_000;

/** The most scans the progress screen loads. A year of weekly scans is 52. */
export const HISTORY_LIMIT = 500;

/** The comparison frame, width over height: the 3:4 of a scan photo. Either photo is cropped to it, never stretched. */
export const COMPARE_FRAME_ASPECT = 3 / 4;

/** How far one screen-reader step moves the comparison slider, as a fraction of the width. */
export const COMPARE_STEP = 0.1;
