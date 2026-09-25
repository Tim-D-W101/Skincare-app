import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { useProgressStore } from '@/stores/useProgressStore';
import { spacing } from '@/theme/tokens';

import { ProgressHero } from './ProgressHero';
import { ProgressTrend } from './ProgressTrend';
import { ScanHistory } from './ScanHistory';
import { StreakCard } from './StreakCard';

/**
 * The product: how the skin's appearance has moved over weeks. Refreshes
 * each time the tab is opened, keeping what's shown while it does.
 */
export function ProgressScreen() {
  const status = useProgressStore((state) => state.status);
  const records = useProgressStore((state) => state.records);
  const refreshFailed = useProgressStore((state) => state.refreshFailed);
  const load = useProgressStore((state) => state.load);
  const loadPhotos = useProgressStore((state) => state.loadPhotos);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // One request signs every thumbnail's link.
  useEffect(() => {
    if (records.length > 0) void loadPhotos(records.map((record) => record.imagePath));
  }, [records, loadPhotos]);

  const retry = () => void load();

  if (records.length === 0) {
    return (
      <Screen edges={['top', 'right', 'left']} contentStyle={styles.centered}>
        {status === 'error' ? (
          <ErrorState message={copy.progress.loadFailed} onRetry={retry} />
        ) : status === 'ready' ? (
          <EmptyState
            title={copy.progress.noScans.title}
            body={copy.progress.noScans.body}
            action={{
              label: copy.progress.noScans.cta,
              onPress: () => router.push('/scan/capture'),
            }}
          />
        ) : (
          <LoadingState lines={4} />
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'right', 'left']} contentStyle={styles.content}>
      <Text variant="h1" accessibilityRole="header">
        {copy.progress.title}
      </Text>

      {refreshFailed ? (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text variant="bodySmall" color="textSecondary" style={styles.noticeText}>
            {copy.progress.loadFailed}
          </Text>
          <Button label={copy.common.retry} onPress={retry} variant="ghost" size="sm" />
        </View>
      ) : null}

      <ProgressHero records={records} />
      <ProgressTrend records={records} />
      <StreakCard scanDates={records.map((record) => record.result.createdAt)} />
      <ScanHistory records={records} />
      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
  },
  content: {
    gap: spacing.lg,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeText: {
    flex: 1,
  },
});
