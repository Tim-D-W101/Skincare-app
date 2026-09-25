import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PixelRatio, StyleSheet, Switch, View } from 'react-native';
import { releaseCapture } from 'react-native-view-shot';

import {
  Button,
  Disclaimer,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Text,
} from '@/components/ui';
import { copy } from '@/constants/copy';
import { SHARE_FORMATS } from '@/constants/share';
import { track } from '@/lib/analytics';
import { logInDevelopment } from '@/lib/errors';
import type { ScanRecord } from '@/lib/progress';
import { captureCard, confirmPhotoShare, openShareSheet } from '@/lib/shareImage';
import { useProgressStore } from '@/stores/useProgressStore';
import { sizes, spacing, useColors } from '@/theme/tokens';

import { CompareCard } from './CompareCard';
import { CompareScores } from './CompareScores';
import { CompareSlider } from './CompareSlider';
import { ScanPicker } from './ScanPicker';

/**
 * Two scans side by side: a wipe between the photos, every score with its
 * change, and the time between them. "Before" starts as the first scan and
 * "after" as the latest; either can be changed.
 */
export function CompareScreen() {
  const status = useProgressStore((state) => state.status);
  const records = useProgressStore((state) => state.records);
  const load = useProgressStore((state) => state.load);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const close = () => router.back();

  if (records.length < 2) {
    return (
      <Screen contentStyle={styles.content}>
        <View style={styles.topBar}>
          <Button
            label={copy.common.close}
            leadingIcon="close"
            onPress={close}
            variant="ghost"
            size="sm"
          />
        </View>
        <View style={styles.centered}>
          {status === 'error' ? (
            <ErrorState message={copy.progress.loadFailed} onRetry={() => void load()} />
          ) : status === 'ready' ? (
            <EmptyState title={copy.progress.compare.title} body={copy.progress.compare.needTwo} />
          ) : (
            <LoadingState lines={4} />
          )}
        </View>
      </Screen>
    );
  }

  return <Comparison records={records} onClose={close} />;
}

function Comparison({ records, onClose }: { records: ScanRecord[]; onClose: () => void }) {
  const loadPhotos = useProgressStore((state) => state.loadPhotos);
  const [beforeId, setBeforeId] = useState(records[0].result.scanId);
  const [afterId, setAfterId] = useState(records[records.length - 1].result.scanId);
  // A scan can leave the history (a refresh after deleting data); fall back to the ends.
  const before = records.find((record) => record.result.scanId === beforeId) ?? records[0];
  const after =
    records.find((record) => record.result.scanId === afterId) ?? records[records.length - 1];

  useEffect(() => {
    void loadPhotos([before.imagePath, after.imagePath]);
  }, [before.imagePath, after.imagePath, loadPhotos]);

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Button
          label={copy.common.close}
          leadingIcon="close"
          onPress={onClose}
          variant="ghost"
          size="sm"
        />
      </View>

      <Text variant="h1" accessibilityRole="header">
        {copy.progress.compare.title}
      </Text>

      <View style={styles.pickers}>
        <ScanPicker
          label={copy.progress.compare.before}
          title={copy.progress.compare.pickBefore}
          records={records}
          selectedId={before.result.scanId}
          onSelect={setBeforeId}
        />
        <ScanPicker
          label={copy.progress.compare.after}
          title={copy.progress.compare.pickAfter}
          records={records}
          selectedId={after.result.scanId}
          onSelect={setAfterId}
        />
      </View>

      <CompareSlider beforePath={before.imagePath} afterPath={after.imagePath} />

      <CompareScores before={before.result} after={after.result} />

      {/* Keyed by the pair, so choosing other scans starts the share settings afresh (photos off). */}
      <CompareShare
        key={`${before.result.scanId}:${after.result.scanId}`}
        before={before}
        after={after}
      />

      <Disclaimer />
    </Screen>
  );
}

type ShareStatus = 'idle' | 'sharing' | 'failed';

/** Shares the comparison as an image. Faces stay off unless switched on, with a confirmation. */
function CompareShare({ before, after }: { before: ScanRecord; after: ScanRecord }) {
  const palette = useColors();
  const beforePhoto = useProgressStore((state) => state.photos[before.imagePath]);
  const afterPhoto = useProgressStore((state) => state.photos[after.imagePath]);
  const [includePhotos, setIncludePhotos] = useState(false);
  // Both photos must be on the card before it can be shared.
  const [loadedCount, setLoadedCount] = useState(0);
  const [photosFailed, setPhotosFailed] = useState(false);
  const [status, setStatus] = useState<ShareStatus>('idle');
  const cardRef = useRef<View>(null);
  const captured = useRef<string[]>([]);

  useEffect(() => {
    const files = captured.current;
    return () => files.forEach(releaseCapture);
  }, []);

  const exported = SHARE_FORMATS.story;
  const captureWidth = exported.width / PixelRatio.get();
  const photosAvailable = beforePhoto !== undefined && afterPhoto !== undefined;
  const cardPhotos =
    includePhotos && photosAvailable ? { before: beforePhoto.url, after: afterPhoto.url } : null;
  const waitingForPhotos = cardPhotos !== null && loadedCount < 2;

  const togglePhotos = (next: boolean) => {
    if (!next) {
      setIncludePhotos(false);
      return;
    }
    confirmPhotoShare(() => {
      setLoadedCount(0);
      setPhotosFailed(false);
      setIncludePhotos(true);
    });
  };

  const handlePhotoLoad = () => setLoadedCount((count) => count + 1);

  const handlePhotoError = () => {
    setPhotosFailed(true);
    setIncludePhotos(false);
  };

  const share = async () => {
    setStatus('sharing');
    try {
      const uri = await captureCard(cardRef, exported);
      captured.current.push(uri);
      track('share_initiated', { surface: 'compare', format: 'story' });
      await openShareSheet(uri);
      setStatus('idle');
    } catch (error: unknown) {
      logInDevelopment('Could not share the comparison', error);
      setStatus('failed');
    }
  };

  return (
    <View style={styles.share}>
      <Text variant="h3" accessibilityRole="header">
        {copy.progress.compare.share}
      </Text>

      {photosAvailable ? (
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{copy.progress.compare.includePhotos}</Text>
            <Switch
              value={includePhotos}
              onValueChange={togglePhotos}
              accessibilityLabel={copy.progress.compare.includePhotos}
              trackColor={{ false: palette.border, true: palette.accent }}
              thumbColor={palette.surfaceElevated}
            />
          </View>
          <Text variant="caption" color="textSecondary">
            {copy.share.includePhotoHint}
          </Text>
          {photosFailed ? (
            <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
              {copy.progress.compare.photosFailed}
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
        loading={status === 'sharing' || waitingForPhotos}
        variant="secondary"
        fullWidth
      />

      {/* The card that becomes the image, full size and just off screen. */}
      <View
        style={[styles.offscreen, { width: captureWidth }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View ref={cardRef} collapsable={false}>
          <CompareCard
            width={captureWidth}
            before={before.result}
            after={after.result}
            photos={cardPhotos}
            onPhotoLoad={handlePhotoLoad}
            onPhotoError={handlePhotoError}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  topBar: {
    alignItems: 'flex-start',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  pickers: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  share: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
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
