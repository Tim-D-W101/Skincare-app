import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { camera } from '@/theme/tokens';

export interface GhostOverlayProps {
  /** Short-lived signed URL of the previous scan photo. */
  url: string;
  /** Mirror to match a mirrored preview (the front camera). The stored photo isn't mirrored. */
  mirrored: boolean;
}

/**
 * The previous scan photo, faint over the preview, for lining up the same
 * framing as last time. Cached in memory only: it never touches the disk.
 * Decorative: hidden from screen readers.
 */
export function GhostOverlay({ url, mirrored }: GhostOverlayProps) {
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.passThrough]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={{ uri: url }}
        cachePolicy="memory"
        contentFit="cover"
        style={[StyleSheet.absoluteFill, styles.faint, mirrored ? styles.mirrored : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  passThrough: {
    pointerEvents: 'none',
  },
  faint: {
    opacity: camera.ghostOpacity,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
});
