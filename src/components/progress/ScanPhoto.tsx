import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui';
import { useProgressStore } from '@/stores/useProgressStore';
import { sizes, useColors } from '@/theme/tokens';

export interface ScanPhotoProps {
  /** Storage path of the scan photo. */
  path: string;
  /** Sets the size and shape. The photo fills it, cropped rather than stretched. */
  style: StyleProp<ViewStyle>;
}

/**
 * A scan photo from the private bucket, through a short-lived signed link
 * held in memory. Photos are only cached in memory, never on disk. If the
 * link stops working (it expired), it is renewed once; if that fails too, a
 * quiet placeholder stays in its place.
 */
export function ScanPhoto({ path, style }: ScanPhotoProps) {
  const palette = useColors();
  const photo = useProgressStore((state) => state.photos[path]);
  const unavailable = useProgressStore((state) => state.photoErrors[path] === true);
  const renewPhoto = useProgressStore((state) => state.renewPhoto);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  const broken = unavailable || failedUrls.length >= 2;
  const showImage = photo !== undefined && !broken && !failedUrls.includes(photo.url);

  const handleError = () => {
    if (!photo) return;
    setFailedUrls((urls) => [...urls, photo.url]);
    if (failedUrls.length === 0) void renewPhoto(path);
  };

  return (
    <View
      style={[styles.frame, { backgroundColor: palette.surface }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showImage ? (
        <Image
          source={{ uri: photo.url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory"
          recyclingKey={path}
          onError={handleError}
        />
      ) : null}
      {broken ? <Icon name="alert" size={sizes.icon.sm} color="textTertiary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
