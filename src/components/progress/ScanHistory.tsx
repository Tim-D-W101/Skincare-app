import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { formatShortDate } from '@/lib/dates';
import type { ScanRecord } from '@/lib/progress';
import { opacity, radius, sizes, spacing } from '@/theme/tokens';

import { ScanPhoto } from './ScanPhoto';

export interface ScanHistoryProps {
  /** Oldest first. Shown newest first. */
  records: ScanRecord[];
}

function describeDelta(delta: number): string {
  if (delta > 0) return copy.progress.history.changeUp(delta);
  if (delta < 0) return copy.progress.history.changeDown(-delta);
  return copy.progress.history.changeSame;
}

/** Every scan, newest first, each opening its full results. */
export function ScanHistory({ records }: ScanHistoryProps) {
  const rows = records
    .map((record, index) => ({
      record,
      delta: index > 0 ? record.result.overall - records[index - 1].result.overall : null,
    }))
    .reverse();

  return (
    <Card style={styles.card}>
      <Text variant="h3" accessibilityRole="header">
        {copy.progress.history.title}
      </Text>
      {rows.map(({ record, delta }) => {
        const { result } = record;
        const date = formatShortDate(result.createdAt);
        const change = delta === null ? copy.progress.history.baseline : describeDelta(delta);
        return (
          <Pressable
            key={result.scanId}
            onPress={() => router.push(`/progress/${result.scanId}`)}
            accessibilityRole="button"
            accessibilityLabel={copy.progress.history.row(date, result.overall, change)}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            <ScanPhoto path={record.imagePath} style={styles.thumbnail} />
            <View style={styles.details}>
              <Text variant="label">{date}</Text>
              <Text variant="bodySmall" color="textSecondary">
                {delta === null
                  ? copy.progress.history.baseline
                  : copy.progress.history.delta(delta)}
              </Text>
            </View>
            <Text variant="h3">{result.overall}</Text>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  thumbnail: {
    width: sizes.thumbnail.width,
    height: sizes.thumbnail.height,
    borderRadius: radius.sm,
  },
  details: {
    flex: 1,
    gap: spacing.xs,
  },
});
