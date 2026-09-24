/**
 * analyze-scan: turns an uploaded scan photo into validated scores.
 *
 * Contract
 *   POST { scanId }  with the user's access token in the Authorization header.
 *   200 { ok: true } once the scan is finished, or 4xx/5xx { ok: false, code }.
 *   The app follows the scan row through Realtime, not through this response.
 *
 * The Gemini key and the service role key exist only here, as Edge Function
 * secrets. See README.md for setup and deployment.
 */
import { Buffer } from 'node:buffer';

import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { z } from 'zod';

import { AnalysisError, analyseImage, type Attempt, type ScoredAnalysis } from './analysis.ts';
import { MODEL } from './model.ts';
import { PROMPT_VERSION } from './prompt.ts';

type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'ALREADY_PROCESSED'
  | 'IMAGE_TOO_LARGE'
  | 'MODEL_TIMEOUT'
  | 'MODEL_INVALID_RESPONSE'
  | 'INTERNAL';

const HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  ALREADY_PROCESSED: 409,
  IMAGE_TOO_LARGE: 413,
  MODEL_TIMEOUT: 504,
  MODEL_INVALID_RESPONSE: 502,
  INTERNAL: 500,
};

const BUCKET = 'scans';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
/** Long enough to start the download, and no longer. */
const SIGNED_URL_TTL_SECONDS = 60;
const DOWNLOAD_TIMEOUT_MS = 15_000;
const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/webp']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fail loudly at startup: without these the function can do nothing useful,
// and a boot error is far easier to spot than a string of failed scans.
function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing secret ${name}. See supabase/functions/analyze-scan/README.md.`);
  }
  return value;
}

const GEMINI_API_KEY = requireSecret('GEMINI_API_KEY');
// Provided automatically to every hosted Edge Function.
const SUPABASE_URL = requireSecret('SUPABASE_URL');
const SERVICE_ROLE_KEY = requireSecret('SUPABASE_SERVICE_ROLE_KEY');

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const scanRow = z.object({
  id: z.string(),
  user_id: z.string(),
  status: z.string(),
  image_path: z.string(),
});

/** A failure with a code the app has a message for. */
class ScanFailure extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ScanFailure';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorResponse(code: ErrorCode): Response {
  return json({ ok: false, code }, HTTP_STATUS[code]);
}

/** Structured logs, keyed by scan id. Never the image, never the model's text. */
function log(level: 'info' | 'error', event: Record<string, unknown>): void {
  const line = JSON.stringify({ fn: 'analyze-scan', ...event });
  if (level === 'error') console.error(line);
  else console.log(line);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

async function readScanId(request: Request): Promise<string | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Not JSON at all: the caller gets BAD_REQUEST.
    return null;
  }
  if (typeof body !== 'object' || body === null || !('scanId' in body)) return null;
  const { scanId } = body;
  return typeof scanId === 'string' && UUID_PATTERN.test(scanId) ? scanId.toLowerCase() : null;
}

async function downloadImage(path: string): Promise<{ base64: string; mimeType: string }> {
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error(`Could not sign the image URL: ${error?.message}`);

  const response = await fetch(data.signedUrl, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Image download failed with HTTP ${response.status}`);

  const declaredBytes = Number(response.headers.get('content-length') ?? 0);
  if (declaredBytes > MAX_IMAGE_BYTES) {
    await response.body?.cancel();
    throw new ScanFailure('IMAGE_TOO_LARGE', `Image is ${declaredBytes} bytes`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ScanFailure('IMAGE_TOO_LARGE', `Image is ${bytes.byteLength} bytes`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
  return {
    base64: Buffer.from(bytes).toString('base64'),
    mimeType: SUPPORTED_MIME_TYPES.has(contentType) ? contentType : 'image/jpeg',
  };
}

/** Moves a claimed scan to 'failed' or 'rejected'. Only ever from 'processing'. */
async function finishWithoutScores(
  scanId: string,
  status: 'failed' | 'rejected',
  reason: string,
): Promise<void> {
  const { error } = await admin
    .from('scans')
    .update({
      status,
      failure_reason: reason,
      completed_at: new Date().toISOString(),
      model: MODEL.name,
      prompt_version: PROMPT_VERSION,
    })
    .eq('id', scanId)
    .eq('status', 'processing');
  if (error) throw new Error(`Could not mark the scan ${status}: ${error.message}`);
}

/** Saves the scores, completes the scan and uses up the free scan, in one transaction. */
async function completeScan(scanId: string, analysis: ScoredAnalysis): Promise<void> {
  const { error } = await admin.rpc('complete_scan', {
    p_scan_id: scanId,
    p_result: {
      ...analysis.scores,
      overall: analysis.overall,
      headline: analysis.headline,
      observations: analysis.observations,
      focus_areas: analysis.focusAreas,
      refer_to_professional: analysis.referToProfessional,
      raw: analysis.raw,
    },
    p_model: MODEL.name,
    p_prompt_version: PROMPT_VERSION,
  });
  if (error) throw new Error(`Could not save the results: ${error.message}`);
}

function logUsage(scanId: string, attempts: Attempt[], outcome: string): void {
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  for (const { usage } of attempts) {
    inputTokens += usage?.inputTokens ?? 0;
    outputTokens += usage?.outputTokens ?? 0;
    costUsd += usage?.costUsd ?? 0;
  }
  log('info', {
    scanId,
    outcome,
    model: MODEL.name,
    promptVersion: PROMPT_VERSION,
    attempts: attempts.length,
    problems: attempts.map((attempt) => attempt.problem).filter(Boolean),
    inputTokens,
    outputTokens,
    costUsd: Number(costUsd.toFixed(6)),
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (request) => {
  if (request.method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED');

  // 1. Who is calling? Anonymous users are real users with valid tokens and
  //    are allowed; a missing or invalid token is not.
  const token = bearerToken(request);
  if (!token) return errorResponse('UNAUTHORIZED');
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError && isAuthRetryableFetchError(authError)) {
    // The auth server couldn't be reached: not the caller's fault.
    log('error', { stage: 'auth', message: authError.message });
    return errorResponse('INTERNAL');
  }
  if (authError || !auth.user) return errorResponse('UNAUTHORIZED');
  const userId = auth.user.id;

  const scanId = await readScanId(request);
  if (!scanId) return errorResponse('BAD_REQUEST');

  // 2. Load the scan and check it belongs to the caller. Mandatory: the scan
  //    id alone proves nothing.
  const { data, error: loadError } = await admin
    .from('scans')
    .select('id, user_id, status, image_path')
    .eq('id', scanId)
    .maybeSingle();
  if (loadError) {
    log('error', { scanId, stage: 'load', message: loadError.message });
    return errorResponse('INTERNAL');
  }
  if (!data) return errorResponse('NOT_FOUND');
  const parsedScan = scanRow.safeParse(data);
  if (!parsedScan.success) {
    log('error', { scanId, stage: 'load', message: 'Unexpected scan row shape' });
    return errorResponse('INTERNAL');
  }
  const scan = parsedScan.data;
  if (scan.user_id !== userId) {
    log('error', { scanId, stage: 'ownership', message: 'Scan belongs to another user' });
    return errorResponse('FORBIDDEN');
  }

  // 3. Only a pending scan is analysed, so retries can't pay for it twice.
  if (scan.status !== 'pending') return errorResponse('ALREADY_PROCESSED');

  // 4. Claim it. The status filter makes this atomic: of two overlapping
  //    calls, only one gets the row.
  const { data: claimed, error: claimError } = await admin
    .from('scans')
    .update({ status: 'processing' })
    .eq('id', scanId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (claimError) {
    log('error', { scanId, stage: 'claim', message: claimError.message });
    return errorResponse('INTERNAL');
  }
  if (!claimed) return errorResponse('ALREADY_PROCESSED');

  // From here, every path must leave the row 'complete', 'rejected' or
  // 'failed'. A row stuck on 'processing' is a user watching a spinner forever.
  let settled = false;
  let failureCode: ErrorCode = 'INTERNAL';
  try {
    // 5. The image, fetched with the service role.
    const image = await downloadImage(scan.image_path);

    // 6-9. The model call, validation, one retry, clamping and overall.
    const analysis = await analyseImage(image, GEMINI_API_KEY);

    if (!analysis.usable) {
      await finishWithoutScores(scanId, 'rejected', analysis.rejectReason);
      settled = true;
      logUsage(scanId, analysis.attempts, `rejected:${analysis.rejectReason}`);
      return json({ ok: true });
    }

    // 10. Scores, status and the free scan, together.
    await completeScan(scanId, analysis);
    settled = true;
    logUsage(scanId, analysis.attempts, 'complete');
    return json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof ScanFailure || error instanceof AnalysisError) failureCode = error.code;
    if (error instanceof AnalysisError) logUsage(scanId, error.attempts, `failed:${error.code}`);
    log('error', { scanId, stage: 'analyse', code: failureCode, message: describe(error) });
    return errorResponse(failureCode);
  } finally {
    if (!settled) {
      try {
        await finishWithoutScores(scanId, 'failed', failureCode);
      } catch (markError: unknown) {
        log('error', { scanId, stage: 'mark-failed', message: describe(markError) });
      }
    }
  }
});
