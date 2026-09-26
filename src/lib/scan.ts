import { randomUUID } from 'expo-crypto';

import { ANALYZE_SCAN_FUNCTION, ATTRIBUTE_KEYS, SCANS_BUCKET } from '@/constants/scan';
import { logInDevelopment, readFunctionErrorCode } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Json, Tables } from '@/types/database';
import type { AttributeKey, CaptureQuality, ScanResult, ScanStatus } from '@/types/scan';

/**
 * The app's side of the scan pipeline: upload the photo, create the scan row,
 * start the analyze-scan Edge Function, and read the outcome.
 */

/** Which step of submitting failed. Neither leaves anything behind on the server. */
export type SubmitStage = 'session' | 'upload' | 'save';

export class ScanSubmitError extends Error {
  readonly stage: SubmitStage;
  readonly cause: unknown;

  constructor(stage: SubmitStage, cause: unknown) {
    super(`Scan submit failed at ${stage}`);
    this.name = 'ScanSubmitError';
    this.stage = stage;
    this.cause = cause;
  }
}

/** How the Edge Function call ended. `code` is its machine-readable error code, if it sent one. */
export type StartResult = { ok: true } | { ok: false; code: string | null; error: unknown };

export interface SubmittedScan {
  scanId: string;
  /**
   * Settles when the Edge Function responds, which is after the analysis
   * finishes. Never rejects. Progress is followed on the scan row meanwhile.
   */
  started: Promise<StartResult>;
}

export interface ScanUpdate {
  status: ScanStatus;
  /** A reject reason for 'rejected', an error code for 'failed'. */
  failureReason: string | null;
}

const SCAN_STATUSES = new Set<string>(['pending', 'processing', 'complete', 'failed', 'rejected']);

function isScanStatus(value: unknown): value is ScanStatus {
  return typeof value === 'string' && SCAN_STATUSES.has(value);
}

function isAttributeKey(value: unknown): value is AttributeKey {
  return typeof value === 'string' && (ATTRIBUTE_KEYS as readonly string[]).includes(value);
}

/** Reads status and reason from a scans row, from a query or a Realtime payload. */
export function parseScanUpdate(row: unknown): ScanUpdate | null {
  if (typeof row !== 'object' || row === null || !('status' in row)) return null;
  const { status } = row;
  if (!isScanStatus(status)) return null;
  const reason = 'failure_reason' in row ? row.failure_reason : null;
  return { status, failureReason: typeof reason === 'string' ? reason : null };
}

async function removeUpload(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(SCANS_BUCKET).remove([path]);
    if (error) throw error;
  } catch (error: unknown) {
    // Nothing more the app can do: the file sits in the user's own private
    // folder and is removed with their account.
    logInDevelopment('Could not remove an upload after a failed save', error);
  }
}

/**
 * Uploads the photo, creates the pending scan row, and starts the analysis.
 * Throws ScanSubmitError if the upload or the row fails; resolves with the
 * scan id as soon as the row exists.
 */
export async function submitScan(
  imageUri: string,
  captureQuality: CaptureQuality,
): Promise<SubmittedScan> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (sessionError || !userId) throw new ScanSubmitError('session', sessionError);

  const scanId = randomUUID();
  // The storage policies and the scans insert policy both require this exact shape.
  const path = `${userId}/${scanId}.jpg`;

  // 1. Upload first: if it fails, there is no row to clean up.
  try {
    const bytes = await (await fetch(imageUri)).arrayBuffer();
    const { error } = await supabase.storage
      .from(SCANS_BUCKET)
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
  } catch (error: unknown) {
    throw new ScanSubmitError('upload', error);
  }

  // 2. The row. If it fails, remove the upload so no file is orphaned.
  const quality: Json = {
    brightness: captureQuality.brightness,
    motion: captureQuality.motion,
    facing: captureQuality.facing,
  };
  const { error: insertError } = await supabase
    .from('scans')
    .insert({ id: scanId, user_id: userId, image_path: path, capture_quality: quality });
  if (insertError) {
    await removeUpload(path);
    throw new ScanSubmitError('save', insertError);
  }

  // 3. Start the analysis without waiting for it to finish.
  return { scanId, started: startAnalysis(scanId) };
}

/** Calls the Edge Function for a pending scan. Safe to repeat: a scan is only ever analysed once. */
export async function startAnalysis(scanId: string): Promise<StartResult> {
  try {
    const { error } = await supabase.functions.invoke(ANALYZE_SCAN_FUNCTION, { body: { scanId } });
    if (!error) return { ok: true };
    return { ok: false, code: await readFunctionErrorCode(error), error };
  } catch (error: unknown) {
    return { ok: false, code: null, error };
  }
}

export async function fetchScanUpdate(scanId: string): Promise<ScanUpdate> {
  const { data, error } = await supabase
    .from('scans')
    .select('status, failure_reason')
    .eq('id', scanId)
    .single();
  if (error) throw error;
  const update = parseScanUpdate(data);
  if (!update) throw new Error(`Unexpected scan status: ${String(data.status)}`);
  return update;
}

function stringList(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export const RESULT_COLUMNS =
  'scan_id, created_at, overall, clarity, texture, pores, hydration, redness, evenness, firmness, headline, observations, focus_areas, refer_to_professional';

export type ResultRow = Pick<
  Tables<'scan_results'>,
  | 'scan_id'
  | 'created_at'
  | 'overall'
  | AttributeKey
  | 'headline'
  | 'observations'
  | 'focus_areas'
  | 'refer_to_professional'
>;

export async function fetchScanResult(scanId: string): Promise<ScanResult> {
  const { data, error } = await supabase
    .from('scan_results')
    .select(RESULT_COLUMNS)
    .eq('scan_id', scanId)
    .single();
  if (error) throw error;
  return toScanResult(data);
}

/**
 * The completed scan just before `result`, for the change since then. Null
 * when `result` is the first. Row-level security limits this to the user's own.
 */
export async function fetchPreviousResult(result: ScanResult): Promise<ScanResult | null> {
  const { data, error } = await supabase
    .from('scan_results')
    .select(RESULT_COLUMNS)
    .lt('created_at', result.createdAt)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toScanResult(data) : null;
}

export function toScanResult(data: ResultRow): ScanResult {
  return {
    scanId: data.scan_id,
    createdAt: data.created_at,
    overall: data.overall,
    scores: {
      clarity: data.clarity,
      texture: data.texture,
      pores: data.pores,
      hydration: data.hydration,
      redness: data.redness,
      evenness: data.evenness,
      firmness: data.firmness,
    },
    headline: data.headline,
    observations: stringList(data.observations),
    focusAreas: stringList(data.focus_areas).filter(isAttributeKey),
    referToProfessional: data.refer_to_professional,
  };
}
