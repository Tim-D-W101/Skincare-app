import { z } from 'zod';

import { findBannedTerms } from './compliance.ts';
import { estimateCostUsd, generateContentUrl, MODEL } from './model.ts';
import {
  ATTRIBUTE_KEYS,
  REJECT_REASONS,
  RESPONSE_SCHEMA,
  RETRY_INSTRUCTION,
  SYSTEM_PROMPT,
  USER_INSTRUCTION,
  type AttributeKey,
  type RejectReason,
} from './prompt.ts';
import { clampScore, weightedOverall } from './scoring.ts';

/**
 * One photo in, validated scores out. Shared by the analyze-scan Edge
 * Function and the calibration harness, so both run exactly the same path:
 * the same prompt, model, settings, validation and retry.
 *
 * Nothing here logs. Callers decide what to record, and never record the image.
 */

export type AnalysisErrorCode = 'MODEL_TIMEOUT' | 'MODEL_INVALID_RESPONSE' | 'INTERNAL';

export interface Usage {
  inputTokens: number;
  /** Includes the model's thinking tokens, which are billed as output. */
  outputTokens: number;
  costUsd: number;
}

/** One call to the model. `problem` says why its reply wasn't used, or is null when it was. */
export interface Attempt {
  problem: string | null;
  /** Banned terms that made the reply unusable, if that was the problem. */
  bannedTerms: string[];
  usage: Usage | null;
}

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;
  readonly attempts: Attempt[];

  constructor(code: AnalysisErrorCode, message: string, attempts: Attempt[]) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.attempts = attempts;
  }
}

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export interface ScoredAnalysis {
  usable: true;
  scores: Record<AttributeKey, number>;
  /** Recomputed from the attribute scores. */
  overall: number;
  /** The model's own overall, kept for comparison only. */
  modelOverall: number;
  headline: string;
  observations: string[];
  focusAreas: AttributeKey[];
  referToProfessional: boolean;
  /** The validated model output, stored for debugging. */
  raw: unknown;
  attempts: Attempt[];
}

export interface RejectedAnalysis {
  usable: false;
  rejectReason: RejectReason;
  raw: unknown;
  attempts: Attempt[];
}

export type Analysis = ScoredAnalysis | RejectedAnalysis;

const MAX_OBSERVATIONS = 4;
const MAX_FOCUS_AREAS = 3;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const score = z.number();

const baseOutput = z.object({
  usable: z.boolean(),
  reject_reason: z.string().nullable(),
  observations: z.array(z.string()),
  clarity: score,
  texture: score,
  pores: score,
  hydration: score,
  redness: score,
  evenness: score,
  firmness: score,
  overall: score,
  headline: z.string(),
  focus_areas: z.array(z.string()),
  refer_to_professional: z.boolean(),
});

/** A usable reply needs real text; an unusable one needs a known reason. */
const modelOutput = z.discriminatedUnion('usable', [
  baseOutput.extend({
    usable: z.literal(true),
    observations: z.array(z.string().trim().min(1)).min(1),
    headline: z.string().trim().min(1),
    focus_areas: z.array(z.enum(ATTRIBUTE_KEYS)).min(1),
  }),
  baseOutput.extend({
    usable: z.literal(false),
    reject_reason: z.enum(REJECT_REASONS),
  }),
]);

/** The parts of a generateContent reply we read. Unknown fields are ignored. */
const generateContentReply = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(z.object({ text: z.string().optional(), thought: z.boolean().optional() }))
              .optional(),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      candidatesTokenCount: z.number().optional(),
      thoughtsTokenCount: z.number().optional(),
    })
    .optional(),
});

type Interpretation =
  | { ok: true; analysis: Omit<ScoredAnalysis, 'attempts'> | Omit<RejectedAnalysis, 'attempts'> }
  | { ok: false; problem: string; bannedTerms: string[] };

function interpret(text: string): Interpretation {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'reply was not valid JSON', bannedTerms: [] };
  }

  const parsed = modelOutput.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'reply'}: ${issue.code}`)
      .join('; ');
    return { ok: false, problem: `reply did not match the schema (${issues})`, bannedTerms: [] };
  }

  const output = parsed.data;
  if (!output.usable) {
    return {
      ok: true,
      analysis: { usable: false, rejectReason: output.reject_reason, raw: output },
    };
  }

  const observations = output.observations.slice(0, MAX_OBSERVATIONS);
  const bannedTerms = findBannedTerms([output.headline, ...observations].join('\n'));
  if (bannedTerms.length > 0) {
    return {
      ok: false,
      problem: `reply used banned vocabulary (${bannedTerms.join(', ')})`,
      bannedTerms,
    };
  }

  const scores = Object.fromEntries(
    ATTRIBUTE_KEYS.map((key) => [key, clampScore(output[key])]),
  ) as Record<AttributeKey, number>;

  return {
    ok: true,
    analysis: {
      usable: true,
      scores,
      overall: weightedOverall(scores),
      modelOverall: clampScore(output.overall),
      headline: output.headline,
      observations,
      focusAreas: [...new Set(output.focus_areas)].slice(0, MAX_FOCUS_AREAS),
      referToProfessional: output.refer_to_professional,
      raw: output,
    },
  };
}

// ---------------------------------------------------------------------------
// The model call
// ---------------------------------------------------------------------------

interface Reply {
  text: string | null;
  /** Why there is no text, when there isn't. */
  problem: string;
  usage: Usage | null;
}

function transportError(error: unknown, attempts: Attempt[]): AnalysisError {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new AnalysisError('MODEL_TIMEOUT', `No reply within ${MODEL.timeoutMs} ms`, attempts);
  }
  const message = error instanceof Error ? error.message : String(error);
  return new AnalysisError('INTERNAL', `Model request failed: ${message}`, attempts);
}

async function callModel(
  image: ImageInput,
  apiKey: string,
  retry: boolean,
  attempts: Attempt[],
): Promise<Reply> {
  const parts: Record<string, unknown>[] = [
    { inlineData: { mimeType: image.mimeType, data: image.base64 } },
    { text: USER_INSTRUCTION },
  ];
  if (retry) parts.push({ text: RETRY_INSTRUCTION });

  let payload: unknown;
  try {
    const response = await fetch(generateContentUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: MODEL.generation.temperature,
          maxOutputTokens: MODEL.generation.maxOutputTokens,
          thinkingConfig: { thinkingLevel: MODEL.generation.thinkingLevel },
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      // Covers reading the body too, not just the headers.
      signal: AbortSignal.timeout(MODEL.timeoutMs),
    });
    if (!response.ok) {
      // Google's error bodies describe the request, never echo the image.
      const detail = (await response.text()).slice(0, 300);
      throw new AnalysisError(
        'INTERNAL',
        `Model request failed with HTTP ${response.status}: ${detail}`,
        attempts,
      );
    }
    payload = await response.json();
  } catch (error: unknown) {
    if (error instanceof AnalysisError) throw error;
    throw transportError(error, attempts);
  }

  const reply = generateContentReply.safeParse(payload);
  if (!reply.success) return { text: null, problem: 'unexpected reply format', usage: null };

  const { candidates, promptFeedback, usageMetadata } = reply.data;
  const inputTokens = usageMetadata?.promptTokenCount ?? 0;
  const outputTokens =
    (usageMetadata?.candidatesTokenCount ?? 0) + (usageMetadata?.thoughtsTokenCount ?? 0);
  const usage: Usage | null = usageMetadata
    ? { inputTokens, outputTokens, costUsd: estimateCostUsd(inputTokens, outputTokens) }
    : null;

  if (promptFeedback?.blockReason) {
    return { text: null, problem: `request blocked (${promptFeedback.blockReason})`, usage };
  }

  const candidate = candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => part.thought !== true)
    .map((part) => part.text ?? '')
    .join('');
  if (!text) {
    return {
      text: null,
      problem: `empty reply (finish reason ${candidate?.finishReason ?? 'unknown'})`,
      usage,
    };
  }
  return { text, problem: '', usage };
}

/**
 * Analyses one photo. Retries once, with a stricter instruction, when the
 * first reply can't be used. Throws AnalysisError when the model times out,
 * can't be reached, or fails twice.
 */
export async function analyseImage(image: ImageInput, apiKey: string): Promise<Analysis> {
  const attempts: Attempt[] = [];

  for (const retry of [false, true]) {
    const reply = await callModel(image, apiKey, retry, attempts);
    const result: Interpretation =
      reply.text === null
        ? { ok: false, problem: reply.problem, bannedTerms: [] }
        : interpret(reply.text);

    attempts.push({
      problem: result.ok ? null : result.problem,
      bannedTerms: result.ok ? [] : result.bannedTerms,
      usage: reply.usage,
    });
    if (result.ok) return { ...result.analysis, attempts };
  }

  throw new AnalysisError(
    'MODEL_INVALID_RESPONSE',
    'The model did not return a usable reply after one retry',
    attempts,
  );
}
