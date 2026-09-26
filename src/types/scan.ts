import type { copy } from '@/constants/copy';
import type { ATTRIBUTE_KEYS } from '@/constants/scan';

export type CameraFacing = 'front' | 'back';

/**
 * Measurements taken at the moment of capture, sent with the scan as
 * `scans.capture_quality` so results can be read in context.
 */
export interface CaptureQuality {
  /** Mean brightness of the face area (0-255). Null when it couldn't be measured. */
  brightness: number | null;
  /** Recent movement of the phone, in g. Null when the accelerometer is unavailable. */
  motion: number | null;
  facing: CameraFacing;
}

/** A processed photo waiting in the app's cache: never the photo library. */
export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
  quality: CaptureQuality;
}

/** A scans row's status. The Edge Function moves it on from 'pending'. */
export type ScanStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'rejected';

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/** Why a photo couldn't be scored. Each has a message in copy.scan.rejected.reasons. */
export type RejectReason = keyof typeof copy.scan.rejected.reasons;

/** The scores and text for one completed scan. */
export interface ScanResult {
  scanId: string;
  createdAt: string;
  overall: number;
  scores: Record<AttributeKey, number>;
  headline: string;
  observations: string[];
  focusAreas: AttributeKey[];
  referToProfessional: boolean;
}
