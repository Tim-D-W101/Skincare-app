import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { SCAN_SLOW_MS, SCAN_STILL_WORKING_MS } from '@/constants/scan';
import { useAuthStore } from '@/stores/useAuthStore';
import { useScanStore, type AnalysisState } from '@/stores/useScanStore';
import { radius, sizes, spacing, useColors } from '@/theme/tokens';

import { ScanSweep } from './ScanSweep';

type WaitLevel = 'normal' | 'stillWorking' | 'slow';

/** The real steps, in order. The list shows which one the scan is on. */
const STEPS = [
  { stage: 'uploading', label: copy.scan.analysing.statuses.uploading },
  { stage: 'queued', label: copy.scan.analysing.statuses.queued },
  { stage: 'processing', label: copy.scan.analysing.statuses.processing },
] as const;

type InProgress = Extract<AnalysisState, { stage: (typeof STEPS)[number]['stage'] }>;

function isInProgress(analysis: AnalysisState): analysis is InProgress {
  return STEPS.some((step) => step.stage === analysis.stage);
}

/** How long the current attempt has run, in the two steps the screen reacts to. */
function useWaitLevel(startedAt: number | null): WaitLevel {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const timers = [SCAN_STILL_WORKING_MS, SCAN_SLOW_MS].map((threshold) =>
      setTimeout(() => setNow(Date.now()), Math.max(0, startedAt + threshold - Date.now())),
    );
    return () => timers.forEach(clearTimeout);
  }, [startedAt]);

  if (startedAt === null) return 'normal';
  const elapsed = now - startedAt;
  if (elapsed >= SCAN_SLOW_MS) return 'slow';
  if (elapsed >= SCAN_STILL_WORKING_MS) return 'stillWorking';
  return 'normal';
}

/**
 * The wait while a scan is analysed: the photo with a slow sweep, and the
 * step it's really on. No invented progress. It moves to the results when
 * the scan completes, explains a rejected photo, and never strands anyone:
 * after a minute it offers to try again or go back.
 */
export function AnalysingScreen() {
  const analysis = useScanStore((state) => state.analysis);
  const capture = useScanStore((state) => state.capture);
  const retryAnalysis = useScanStore((state) => state.retryAnalysis);
  const endScanFlow = useScanStore((state) => state.endScanFlow);
  const freeScanUsed = useAuthStore((state) => state.profile?.free_scan_used ?? false);
  const [photoHeight, setPhotoHeight] = useState(0);

  const inProgress = isInProgress(analysis);
  const wait = useWaitLevel(inProgress ? analysis.startedAt : null);

  useEffect(() => {
    if (analysis.stage === 'complete') router.replace('/scan/result');
  }, [analysis.stage]);

  // Leaving doesn't cancel anything: a scan in progress finishes on the server.
  const leave = useCallback(() => {
    endScanFlow();
    router.dismissTo('/');
  }, [endScanFlow]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        leave();
        return true;
      });
      return () => subscription.remove();
    }, [leave]),
  );

  const retake = () => {
    endScanFlow();
    router.dismissTo('/scan/capture');
  };

  const retry = () => void retryAnalysis();
  // A retry needs the photo, unless the scan was saved and only needs starting.
  const canRetry = capture !== null || (analysis.stage === 'failed' && analysis.restartable);

  const handlePhotoLayout = (event: LayoutChangeEvent) => {
    setPhotoHeight(event.nativeEvent.layout.height);
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Button
          label={copy.common.close}
          leadingIcon="close"
          onPress={leave}
          variant="ghost"
          size="sm"
        />
      </View>

      <PhotoFrame onLayout={handlePhotoLayout}>
        {capture ? (
          <Image
            source={{ uri: capture.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="none"
            accessibilityLabel={copy.scan.analysing.photoLabel}
          />
        ) : null}
        {inProgress ? <ScanSweep height={photoHeight} /> : null}
      </PhotoFrame>

      {inProgress ? (
        <View style={styles.panel}>
          <Text variant="h2" accessibilityRole="header">
            {copy.scan.analysing.title}
          </Text>
          <StepList current={analysis.stage} />
          {wait === 'stillWorking' ? (
            <Text variant="bodySmall" color="textSecondary" accessibilityLiveRegion="polite">
              {copy.scan.analysing.stillWorking}
            </Text>
          ) : null}
          {wait === 'slow' ? (
            <>
              <Text variant="bodySmall" color="textSecondary" accessibilityLiveRegion="polite">
                {copy.scan.analysing.slow}
              </Text>
              <View style={styles.actions}>
                {canRetry ? (
                  <Button label={copy.common.retry} onPress={retry} variant="secondary" fullWidth />
                ) : null}
                <Button
                  label={copy.scan.analysing.goBack}
                  onPress={leave}
                  variant="ghost"
                  fullWidth
                />
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {analysis.stage === 'rejected' ? (
        <View style={styles.panel}>
          <Text variant="h2" accessibilityRole="header">
            {copy.scan.rejected.title}
          </Text>
          {analysis.reason ? (
            <Text accessibilityLiveRegion="polite">
              {copy.scan.rejected.reasons[analysis.reason]}
            </Text>
          ) : null}
          {freeScanUsed ? null : (
            <Text variant="bodySmall" color="textSecondary">
              {copy.scan.rejected.freeScanKept}
            </Text>
          )}
          <View style={styles.actions}>
            <Button label={copy.scan.rejected.retake} onPress={retake} fullWidth size="lg" />
            <Button label={copy.scan.analysing.goBack} onPress={leave} variant="ghost" fullWidth />
          </View>
        </View>
      ) : null}

      {analysis.stage === 'failed' || analysis.stage === 'idle' ? (
        <View style={styles.panel}>
          <Text variant="h2" accessibilityRole="header">
            {copy.scan.failed.title}
          </Text>
          <Text accessibilityLiveRegion="polite">
            {analysis.stage === 'failed' ? analysis.message : copy.errors.generic}
          </Text>
          {freeScanUsed ? null : (
            <Text variant="bodySmall" color="textSecondary">
              {copy.scan.rejected.freeScanKept}
            </Text>
          )}
          <View style={styles.actions}>
            {analysis.stage === 'failed' && canRetry ? (
              <Button label={copy.common.retry} onPress={retry} fullWidth size="lg" />
            ) : null}
            <Button label={copy.scan.analysing.goBack} onPress={leave} variant="ghost" fullWidth />
          </View>
        </View>
      ) : null}

      {analysis.stage === 'complete' ? (
        <View style={styles.panel}>
          <ActivityIndicator accessibilityLabel={copy.common.loading} />
        </View>
      ) : null}
    </Screen>
  );
}

function PhotoFrame({
  children,
  onLayout,
}: {
  children: ReactNode;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const palette = useColors();
  return (
    <View style={[styles.photo, { backgroundColor: palette.surface }]} onLayout={onLayout}>
      {children}
    </View>
  );
}

function StepList({ current }: { current: InProgress['stage'] }) {
  const palette = useColors();
  const currentIndex = STEPS.findIndex((step) => step.stage === current);
  const currentLabel = STEPS[currentIndex].label;

  return (
    <View
      style={styles.steps}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={copy.scan.analysing.title}
      accessibilityValue={{ text: currentLabel }}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
    >
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <View key={step.stage} style={styles.step}>
            <View style={styles.stepMarker}>
              {done ? <Icon name="check" size={sizes.icon.md} color="accent" /> : null}
              {active ? <ActivityIndicator size="small" color={palette.accent} /> : null}
              {!done && !active ? (
                <View style={[styles.stepDot, { borderColor: palette.border }]} />
              ) : null}
            </View>
            <Text
              variant={active ? 'label' : 'bodySmall'}
              color={active ? 'textPrimary' : done ? 'textSecondary' : 'textTertiary'}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  topBar: {
    alignItems: 'flex-start',
  },
  photo: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  panel: {
    gap: spacing.sm,
  },
  steps: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepMarker: {
    width: sizes.icon.lg,
    height: sizes.icon.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: sizes.icon.sm,
    height: sizes.icon.sm,
    borderRadius: radius.full,
    borderWidth: sizes.borderWidth,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
