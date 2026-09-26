import { HISTORY_LIMIT, PHOTO_URL_TTL_SECONDS } from '@/constants/progress';
import { SCANS_BUCKET } from '@/constants/scan';
import { RESULT_COLUMNS, toScanResult } from '@/lib/scan';
import { supabase } from '@/lib/supabase';
import type { ScanResult } from '@/types/scan';

/** One completed scan in the history: its result and where its photo is stored. */
export interface ScanRecord {
  result: ScanResult;
  imagePath: string;
}

const HISTORY_COLUMNS = `${RESULT_COLUMNS}, scans!inner(image_path)` as const;

/**
 * Every completed scan, oldest first. Row-level security limits it to the
 * signed-in user's own. Past the limit, the oldest are the ones left out.
 */
export async function fetchScanHistory(): Promise<ScanRecord[]> {
  const { data, error } = await supabase
    .from('scan_results')
    .select(HISTORY_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return data
    .map((row) => ({ result: toScanResult(row), imagePath: row.scans.image_path }))
    .reverse();
}

/** When each completed scan was taken, oldest first. For reminders, which need nothing else. */
export async function fetchScanDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('scan_results')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return data.map((row) => row.created_at).reverse();
}

export interface SignedPhoto {
  url: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
}

/**
 * Short-lived links to scan photos in the private bucket, one request for
 * all of them. A photo that can't be signed (deleted, say) is left out.
 */
export async function signPhotoUrls(paths: string[]): Promise<Record<string, SignedPhoto>> {
  if (paths.length === 0) return {};
  const requestedAt = Date.now();
  const { data, error } = await supabase.storage
    .from(SCANS_BUCKET)
    .createSignedUrls(paths, PHOTO_URL_TTL_SECONDS);
  if (error) throw error;

  const signed: Record<string, SignedPhoto> = {};
  for (const item of data) {
    if (item.error || !item.path || !item.signedUrl) continue;
    signed[item.path] = {
      url: item.signedUrl,
      expiresAt: requestedAt + PHOTO_URL_TTL_SECONDS * 1000,
    };
  }
  return signed;
}
