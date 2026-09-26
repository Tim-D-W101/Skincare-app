/**
 * The vision model, in one place. Swapping model is a one-line change to
 * `name` (and the prices, for the cost log). The model name is stored on every
 * scan row next to the prompt version, so results stay traceable.
 *
 * The step up if quality falls short is Gemini 3.5 Flash-Lite (build plan,
 * section 2); check its exact model name in Google's model list. Rerun the
 * calibration harness (scripts/calibrate.ts) after any change here.
 */
export const MODEL = {
  name: 'gemini-3.1-flash-lite',
  apiBase: 'https://generativelanguage.googleapis.com/v1beta',
  /** US dollars per million tokens, from Google's price list (September 2026). */
  pricing: {
    inputPerMillionTokens: 0.25,
    outputPerMillionTokens: 1.5,
  },
  generation: {
    /**
     * Low for consistency between scans, as the build plan asks. Google
     * recommends leaving Gemini 3 models at their default of 1.0: if the
     * calibration runs disagree, compare against 1.0 first.
     */
    temperature: 0.2,
    /** How much the model reasons before answering: 'minimal', 'low', 'medium' or 'high'. */
    thinkingLevel: 'low',
    /** A ceiling against runaway output. A normal reply uses a small fraction. */
    maxOutputTokens: 8192,
  },
  /** Per call. The Edge Function makes at most two calls per scan. */
  timeoutMs: 25_000,
} as const;

export function generateContentUrl(): string {
  return `${MODEL.apiBase}/models/${MODEL.name}:generateContent`;
}

/** Estimated cost of one call, in US dollars. */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const { inputPerMillionTokens, outputPerMillionTokens } = MODEL.pricing;
  return (inputTokens * inputPerMillionTokens + outputTokens * outputPerMillionTokens) / 1_000_000;
}
