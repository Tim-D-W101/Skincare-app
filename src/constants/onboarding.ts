/**
 * The values stored for each onboarding answer. Labels live in copy.ts under
 * the same keys.
 *
 * AGE_BANDS and SKIN_TYPES must match the check constraints on the profiles
 * table. Under 18 is deliberately absent: there is no band for it, and none
 * should be added.
 */

export const AGE_BANDS = ['18_24', '25_34', '35_44', '45_54', '55_plus'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const SKIN_TYPES = ['oily', 'dry', 'combination', 'normal', 'sensitive', 'unsure'] as const;
export type SkinType = (typeof SKIN_TYPES)[number];

export const CONCERNS = [
  'blemishes',
  'uneven_tone',
  'pores',
  'dryness',
  'dullness',
  'fine_lines',
  'redness',
  'oiliness',
] as const;
export type Concern = (typeof CONCERNS)[number];

/** Matches the cardinality check on profiles.concerns. */
export const MAX_CONCERNS = 3;

export const GOALS = [
  'clearer',
  'smoother',
  'even_tone',
  'glow',
  'hydrated',
  'consistency',
] as const;
export type Goal = (typeof GOALS)[number];
