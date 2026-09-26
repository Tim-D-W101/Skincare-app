import type { AttributeKey } from './prompt.ts';

/**
 * How much each attribute counts towards `overall`. The most visible
 * attributes weigh most. They sum to 1.
 *
 * `overall` is always recomputed from the attribute scores rather than taken
 * from the model, so it can never contradict them. Changing a weight changes
 * `overall` for new scans only; stored attribute scores are unaffected, and
 * old overalls can be recomputed from them.
 */
export const ATTRIBUTE_WEIGHTS = {
  clarity: 0.2,
  texture: 0.15,
  pores: 0.1,
  hydration: 0.1,
  redness: 0.15,
  evenness: 0.15,
  firmness: 0.15,
} as const satisfies Record<AttributeKey, number>;

/** An integer from 0 to 100. */
export function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** The weighted mean of the attribute scores, as an integer from 0 to 100. */
export function weightedOverall(scores: Record<AttributeKey, number>): number {
  let total = 0;
  let weights = 0;
  for (const [key, weight] of Object.entries(ATTRIBUTE_WEIGHTS) as [AttributeKey, number][]) {
    total += scores[key] * weight;
    weights += weight;
  }
  return clampScore(total / weights);
}
