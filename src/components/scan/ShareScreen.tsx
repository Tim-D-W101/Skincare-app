import * as Sharing from 'expo-sharing';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, PixelRatio, Pressable, StyleSheet, Switch, View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';

import { Button, Disclaimer, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { DEFAULT_SHARE_FORMAT, SHARE_FORMATS, type ShareFormat } from '@/constants/share';
import { track } from '@/lib/analytics';
import { logInDevelopment } from '@/lib/errors';
import { hapticSelection } from '@/lib/haptics';
import { useScanStore } from '@/stores/useScanStore';
import { radius, shareCard, sizes, spacing, useColors } from '@/theme/tokens';
import type { ScanResult } from '@/types/scan';

import { ShareCard } from './ShareCard';

const FORMAT_OPTIONS: readonly { format: ShareFormat; label: string }[] = [
  { format: 'story', label: copy.share.formatStory },
  { format: 'feed', label: copy.share.formatFeed },
];

type PhotoState = 'loading' | 'ready' | 'failed';
type ShareStatus = 'idle' | 'sharing' | 'failed';

/** Where the result card is made and shared. Opened from the results screen. */
export function ShareScreen() {
  // Snapshots, like the results screen: this screen shows the result it opened with.
  const [analysis] = useState(() => useScanStore.getState().analysis);
  // The photo only exists on the phone until the scan screens close.
  const [photoUri] = useState(() => useScanStore.getState().capture?.uri ?? null);

  if (analysis.stage !== 'complete') return <Redirect href="/" />;
  return (
    <ShareComposer result={analysis.result} previous={analysis.previous} photoUri={photoUri} />
  );
}

function ShareComposer({
  result,
  previous,
  photoUri,
}: {
  result: ScanResult;
  previous: ScanResult | null;
  photoUri: string | null;
}) {
  const palette = useColors();
  const [format, setFormat] = useState<ShareFormat>(DEFAULT_SHARE_FORMAT);
  // Off by default: a face is never shared by accident.
  const [includePhoto, setIncludePhoto] = useState(false);
  const [photoState, setPhotoState] = useState<PhotoState>('loading');
  const [status, setStatus] = useState<ShareStatus>('idle');
  const cardRef = useRef<View>(null);
  const captured = useRef<string[]>([]);

  // Share images live in the app's cache. They're removed once this screen closes,
  // by which time the app they were shared to has its own copy.
  useEffect(() => {
    const files = captured.current;
    return () => files.forEach(releaseCapture);
  }, []);

  const exported = SHARE_FORMATS[format];
  // Drawn at the exported size in physical pixels, so the image is sharp, not upscaled.
  const captureWidth = exported.width / PixelRatio.get();
  const cardPhoto = includePhoto ? photoUri : null;
  const waitingForPhoto = includePhoto && photoState === 'loading';

  const togglePhoto = (next: boolean) => {
    if (!next) {
      setIncludePhoto(false);
      return;
    }
    Alert.alert(copy.share.includePhotoConfirm.title, copy.share.includePhotoConfirm.body, [
      { text: copy.common.cancel, style: 'cancel' },
      {
        text: copy.share.includePhotoConfirm.confirm,
        onPress: () => {
          setPhotoState('loading');
          setIncludePhoto(true);
        },
      },
    ]);
  };

  const handlePhotoError = () => {
    setPhotoState('failed');
    setIncludePhoto(false);
  };

  const share = async () => {
    setStatus('sharing');
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
      const uri = await captureRef(cardRef, {
        format: 'png',
        result: 'tmpfile',
        width: exported.width,
        height: exported.height,
      });
      captured.current.push(uri);
      track('share_initiated', { surface: 'results', format });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: copy.share.title });
      setStatus('idle');
    } catch (error: unknown) {
      logInDevelopment('Could not share the result card', error);
      setStatus('failed');
    }
  };

  return (
    <View style={styles.fill}>
      <Screen scroll contentStyle={styles.content}>
        <View style={styles.topBar}>
          <Button
            label={copy.common.close}
            leadingIcon="close"
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
          />
        </View>

        <Text variant="h2" accessibilityRole="header">
          {copy.share.title}
        </Text>

        <View
          style={styles.previewRow}
          accessible
          accessibilityRole="image"
          accessibilityLabel={copy.share.preview}
        >
          <View style={styles.preview}>
            <ShareCard
              format={format}
              width={shareCard.previewWidth}
              result={result}
              previous={previous}
              photoUri={photoState === 'ready' ? cardPhoto : null}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="label">{copy.share.format}</Text>
          <View
            style={[styles.segments, { borderColor: palette.border }]}
            accessibilityRole="radiogroup"
            accessibilityLabel={copy.share.format}
          >
            {FORMAT_OPTIONS.map((option) => {
              const selected = option.format === format;
              return (
                <Pressable
                  key={option.format}
                  onPress={() => {
                    hapticSelection();
                    setFormat(option.format);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: selected }}
                  style={[styles.segment, selected ? { backgroundColor: palette.accent } : null]}
                >
                  <Text variant="label" color={selected ? 'textInverse' : 'textPrimary'}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {photoUri ? (
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{copy.share.includePhoto}</Text>
              <Switch
                value={includePhoto}
                onValueChange={togglePhoto}
                accessibilityLabel={copy.share.includePhoto}
                trackColor={{ false: palette.border, true: palette.accent }}
                thumbColor={palette.surfaceElevated}
              />
            </View>
            <Text variant="caption" color="textSecondary">
              {copy.share.includePhotoHint}
            </Text>
            {photoState === 'failed' ? (
              <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
                {copy.share.photoFailed}
              </Text>
            ) : null}
          </View>
        ) : null}

        {status === 'failed' ? (
          <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
            {copy.share.failed}
          </Text>
        ) : null}

        <Button
          label={copy.share.shareAction}
          leadingIcon="share"
          onPress={() => void share()}
          loading={status === 'sharing' || waitingForPhoto}
          fullWidth
          size="lg"
        />

        <Disclaimer />
      </Screen>

      {/*
        The card that becomes the image: full size, just off the left edge of
        the screen. Hidden from touch and from screen readers.
      */}
      <View
        style={[styles.offscreen, { width: captureWidth }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View ref={cardRef} collapsable={false}>
          <ShareCard
            format={format}
            width={captureWidth}
            result={result}
            previous={previous}
            photoUri={cardPhoto}
            onPhotoLoad={() => setPhotoState('ready')}
            onPhotoError={handlePhotoError}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
  },
  topBar: {
    alignItems: 'flex-start',
  },
  previewRow: {
    alignItems: 'center',
  },
  preview: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  section: {
    gap: spacing.sm,
  },
  segments: {
    flexDirection: 'row',
    borderWidth: sizes.borderWidth,
    borderRadius: radius.full,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: sizes.control.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget,
  },
  switchLabel: {
    flex: 1,
  },
  offscreen: {
    position: 'absolute',
    top: 0,
    right: '100%',
  },
});
