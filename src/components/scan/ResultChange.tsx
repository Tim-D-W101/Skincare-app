import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ATTRIBUTE_KEYS } from '@/constants/scan';
import { calendarDaysBetween } from '@/lib/dates';
import { sizes, spacing, type ColorName } from '@/theme/tokens';
import type { ScanResult } from '@/types/scan';

export interface ResultChangeProps {
  result: ScanResult;
  previous: ScanResult;
}

interface Change {
  text: string;
  icon: IconName;
  color: ColorName;
}

/**
 * Describes a change in words and a direction arrow, so it never relies on
 * colour. A drop is shown in a neutral tone: it's information, not a warning.
 */
function describeChange(delta: number): Change {
  if (delta > 0) return { text: copy.results.change.up(delta), icon: 'arrowUp', color: 'accent' };
  if (delta < 0) {
    return { text: copy.results.change.down(-delta), icon: 'arrowDown', color: 'textSecondary' };
  }
  return { text: copy.results.change.same, icon: 'minus', color: 'textTertiary' };
}

/** How each score moved since the previous scan, and how long ago that was. */
export function ResultChange({ result, previous }: ResultChangeProps) {
  const days = calendarDaysBetween(previous.createdAt, result.createdAt);
  const items = [
    { key: 'overall', label: copy.results.overall, delta: result.overall - previous.overall },
    ...ATTRIBUTE_KEYS.map((key) => ({
      key,
      label: copy.results.attributes[key],
      delta: result.scores[key] - previous.scores[key],
    })),
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="h3" accessibilityRole="header">
          {copy.results.changeTitle}
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {copy.results.daysSince(days)}
        </Text>
      </View>
      <View style={styles.grid}>
        {items.map((item) => {
          const change = describeChange(item.delta);
          return (
            <View
              key={item.key}
              style={styles.item}
              accessible
              accessibilityLabel={`${item.label}, ${change.text}`}
            >
              <Text variant="caption" color="textSecondary">
                {item.label}
              </Text>
              <View style={styles.delta}>
                <Icon name={change.icon} size={sizes.icon.sm} color={change.color} />
                <Text variant="label">{change.text}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  item: {
    width: '50%',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
