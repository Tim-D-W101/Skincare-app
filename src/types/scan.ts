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
