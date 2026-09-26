import type { CameraView, PictureRef } from 'expo-camera';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import {
  CAPTURE_LONG_EDGE,
  LIGHT_HYSTERESIS,
  LIGHT_TOO_BRIGHT,
  LIGHT_TOO_DARK,
  PHOTO_JPEG_QUALITY,
  PHOTO_LONG_EDGE,
} from '@/constants/capture';
import { meanLuminanceFromJpeg } from '@/lib/jpegLuminance';
import { deleteLocalFile } from '@/lib/photos';
import { camera } from '@/theme/tokens';
import type { CameraFacing, CaptureQuality } from '@/types/scan';

export interface Size {
  width: number;
  height: number;
}

/** An ellipse in preview coordinates. */
export interface Oval {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export type LightLevel = 'unknown' | 'dark' | 'bright' | 'ok';

/** Keys of copy.scan.guidance that the capture screen can show. */
export type Guidance = 'checking' | 'tooDark' | 'tooBright' | 'holdSteady' | 'good';

/** The face guide for a preview of the given size. */
export function faceOval(view: Size): Oval {
  const rx = (view.width * camera.ovalWidth) / 2;
  const ry = Math.min(rx * camera.ovalAspect, (view.height * camera.ovalMaxHeight) / 2);
  return { cx: view.width / 2, cy: view.height * camera.ovalCenterY, rx, ry };
}

function parseSize(value: string): Size | null {
  const match = /^(\d+)x(\d+)$/.exec(value);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

const longEdge = (size: Size) => Math.max(size.width, size.height);

/**
 * The capture size to request: the smallest 4:3 size whose long edge reaches
 * CAPTURE_LONG_EDGE, or the largest 4:3 size when none does. Null leaves the
 * camera's default in place.
 */
export function choosePictureSize(available: readonly string[]): string | null {
  const sizes = available
    .map(parseSize)
    .filter((size): size is Size => size !== null)
    .filter((size) => Math.abs(longEdge(size) / Math.min(size.width, size.height) - 4 / 3) < 0.02);
  if (sizes.length === 0) return null;

  const ascending = [...sizes].sort((a, b) => longEdge(a) - longEdge(b));
  const chosen =
    ascending.find((size) => longEdge(size) >= CAPTURE_LONG_EDGE) ??
    ascending[ascending.length - 1];
  return `${chosen.width}x${chosen.height}`;
}

/**
 * Maps the face oval from the preview onto the photo. The preview fills the
 * screen and crops the camera image to fit, so the two differ in scale and
 * offset. Returns the largest rectangle that fits inside the oval, so the
 * sample is face, not background.
 */
export function faceCrop(photo: Size, view: Size, oval: Oval): CropRect {
  const scale = Math.max(view.width / photo.width, view.height / photo.height);
  const offsetX = (photo.width - view.width / scale) / 2;
  const offsetY = (photo.height - view.height / scale) / 2;

  const halfWidth = oval.rx / Math.SQRT2 / scale;
  const halfHeight = oval.ry / Math.SQRT2 / scale;
  const centerX = offsetX + oval.cx / scale;
  const centerY = offsetY + oval.cy / scale;

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const originX = clamp(Math.round(centerX - halfWidth), 0, photo.width - 1);
  const originY = clamp(Math.round(centerY - halfHeight), 0, photo.height - 1);
  return {
    originX,
    originY,
    width: clamp(Math.round(halfWidth * 2), 1, photo.width - originX),
    height: clamp(Math.round(halfHeight * 2), 1, photo.height - originY),
  };
}

/**
 * Mean brightness (0-255) of the face area right now. Takes a silent frame
 * that stays in memory (nothing is written to the gallery), crops it to the
 * oval, shrinks it to 8x8 and reads the average from the JPEG. Null when the
 * frame couldn't be read.
 */
export async function sampleFaceLuminance(
  cameraView: CameraView,
  view: Size,
): Promise<number | null> {
  const picture = await cameraView.takePictureAsync({ pictureRef: true, shutterSound: false });
  const context = ImageManipulator.manipulate(picture);
  let image: ImageRef | null = null;
  try {
    const crop = faceCrop({ width: picture.width, height: picture.height }, view, faceOval(view));
    image = await context.crop(crop).resize({ width: 8, height: 8 }).renderAsync();
    const { base64, uri } = await image.saveAsync({
      base64: true,
      compress: 1,
      format: SaveFormat.JPEG,
    });
    // Saving always writes a file too. Only the base64 is needed, and samples
    // run a few times a second, so don't let them pile up in the cache.
    deleteLocalFile(uri);
    return base64 ? meanLuminanceFromJpeg(base64) : null;
  } finally {
    image?.release();
    context.release();
    picture.release();
  }
}

/**
 * Turns a full-size capture into the photo that gets uploaded: longest edge
 * 1024px, JPEG at 0.85, saved to the app's private cache. The camera has
 * already rotated the image upright.
 */
export async function processPhoto(picture: PictureRef): Promise<Size & { uri: string }> {
  const context = ImageManipulator.manipulate(picture);
  let image: ImageRef | null = null;
  try {
    if (longEdge(picture) > PHOTO_LONG_EDGE) {
      context.resize(
        picture.width >= picture.height ? { width: PHOTO_LONG_EDGE } : { height: PHOTO_LONG_EDGE },
      );
    }
    image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: PHOTO_JPEG_QUALITY, format: SaveFormat.JPEG });
    return { uri: saved.uri, width: saved.width, height: saved.height };
  } finally {
    image?.release();
    context.release();
    picture.release();
  }
}

/** Movement is stored to three decimal places of g; finer than that is noise. */
const MOTION_DECIMALS = 3;

/** What the camera measured when the photo was taken, as sent in scans.capture_quality. */
export function captureQuality(
  luminance: number | null,
  motion: number | null,
  facing: CameraFacing,
): CaptureQuality {
  const factor = 10 ** MOTION_DECIMALS;
  return {
    brightness: luminance === null ? null : Math.round(luminance),
    motion: motion === null ? null : Math.round(motion * factor) / factor,
    facing,
  };
}

/**
 * Classifies a brightness reading. A reading has to move a little past a
 * limit to leave the state it's in, so the message doesn't flicker.
 */
export function lightLevel(luminance: number | null, previous: LightLevel): LightLevel {
  if (luminance === null) return 'unknown';
  const darkLimit = previous === 'dark' ? LIGHT_TOO_DARK + LIGHT_HYSTERESIS : LIGHT_TOO_DARK;
  const brightLimit =
    previous === 'bright' ? LIGHT_TOO_BRIGHT - LIGHT_HYSTERESIS : LIGHT_TOO_BRIGHT;
  if (luminance < darkLimit) return 'dark';
  if (luminance > brightLimit) return 'bright';
  return 'ok';
}

/**
 * The single most important correction right now. Light comes first, then
 * steadiness. Framing (closer, back, centre) needs face detection, which this
 * SDK doesn't offer, so the oval is the framing guide.
 */
export function pickGuidance(light: LightLevel, steady: boolean): Guidance {
  if (light === 'unknown') return 'checking';
  if (light === 'dark') return 'tooDark';
  if (light === 'bright') return 'tooBright';
  if (!steady) return 'holdSteady';
  return 'good';
}
