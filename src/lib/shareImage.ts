import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Alert, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { copy } from '@/constants/copy';

/**
 * Turns a card drawn off-screen into a PNG of exactly `size` pixels, in the
 * app's cache. The caller removes it with releaseCapture once it has been
 * shared. Throws if the phone can't share, or the capture fails.
 */
export async function captureCard(
  view: RefObject<View | null>,
  size: { width: number; height: number },
): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  return captureRef(view, {
    format: 'png',
    result: 'tmpfile',
    width: size.width,
    height: size.height,
  });
}

/** Opens the system share sheet with a captured card. */
export async function openShareSheet(uri: string): Promise<void> {
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: copy.share.title });
}

/**
 * Asks before a face goes onto a shared image. `onConfirm` only runs if the
 * person says yes; cancelling leaves the photo off.
 */
export function confirmPhotoShare(onConfirm: () => void): void {
  Alert.alert(copy.share.includePhotoConfirm.title, copy.share.includePhotoConfirm.body, [
    { text: copy.common.cancel, style: 'cancel' },
    { text: copy.share.includePhotoConfirm.confirm, onPress: onConfirm },
  ]);
}
