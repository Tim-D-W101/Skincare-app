import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { logInDevelopment } from '@/lib/errors';
import { useScanStore } from '@/stores/useScanStore';
import { spacing } from '@/theme/tokens';

/** Shows the photo before anything is sent. "Use this" is the only way forward. */
export function CaptureConfirm() {
  // The photo as it was on arrival. Retake clears the store's copy, and this
  // screen keeps showing its own while it animates away.
  const [capture] = useState(() => useScanStore.getState().capture);
  const submitCapture = useScanStore((state) => state.submitCapture);
  const discardCapture = useScanStore((state) => state.discardCapture);
  const [kilobytes, setKilobytes] = useState<number | null>(null);

  // Development only: the file size, to check the photo stays well under 500 KB.
  useEffect(() => {
    if (!__DEV__ || !capture) return;
    let active = true;
    fetch(capture.uri)
      .then((response) => response.blob())
      .then((blob) => {
        if (active) setKilobytes(Math.round(blob.size / 1024));
      })
      .catch((sizeError: unknown) => logInDevelopment('Could not read photo size', sizeError));
    return () => {
      active = false;
    };
  }, [capture]);

  if (!capture) return <Redirect href="/scan/capture" />;

  const retake = () => {
    discardCapture();
    router.back();
  };

  const use = () => {
    // Progress and errors show on the waiting screen, so this isn't awaited.
    void submitCapture();
    router.replace('/scan/analysing');
  };

  return (
    <Screen contentStyle={styles.content}>
      <Text variant="h2" accessibilityRole="header">
        {copy.scan.confirm.title}
      </Text>
      <View style={styles.photoArea}>
        <Image
          source={{ uri: capture.uri }}
          style={styles.photo}
          contentFit="contain"
          cachePolicy="none"
          accessibilityLabel={copy.scan.confirm.title}
        />
      </View>
      {__DEV__ ? (
        <Text variant="caption" color="textTertiary" align="center">
          {copy.scan.confirm.devSize(capture.width, capture.height, kilobytes)}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button label={copy.scan.confirm.use} onPress={use} fullWidth size="lg" />
        <Button label={copy.scan.confirm.retake} onPress={retake} variant="secondary" fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  photoArea: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  actions: {
    gap: spacing.sm,
  },
});
