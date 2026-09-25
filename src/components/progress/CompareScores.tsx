import { StyleSheet, View } from 'react-native';

import { describeChange } from '@/components/scan/ResultChange';
import { Card, Icon, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ATTRIBUTE_KEYS } from '@/constants/scan';
import { calendarDaysBetween } from '@/lib/dates';
import { sizes, spacing, useColors } from '@/theme/tokens';
import type { ScanResult } from '@/types/scan';

export interface CompareScoresProps {
  before: ScanResult;
  after: ScanResult;
}

/** Every score from both scans side by side, the change in each, and the time between them. */
export function CompareScores({ before, after }: CompareScoresProps) {
  const palette = useColors();
  const [earlier, later] = before.createdAt <= after.createdAt ? [before, after] : [after, before];
  const days = calendarDaysBetween(earlier.createdAt, later.createdAt);
  const rows = [
    { key: 'overall', label: copy.results.overall, from: before.overall, to: after.overall },
    ...ATTRIBUTE_KEYS.map((key) => ({
      key,
      label: copy.results.attributes[key],
      from: before.scores[key],
      to: after.scores[key],
    })),
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="h3" accessibilityRole="header">
          {copy.progress.compare.scoresTitle}
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          {copy.progress.compare.elapsed(days)}
        </Text>
      </View>

      <View
        style={[styles.row, styles.headingRow, { borderBottomColor: palette.borderSubtle }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text variant="caption" color="textSecondary" style={styles.labelCell}>
          {copy.progress.compare.scoreColumn}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.valueCell}>
          {copy.progress.compare.before}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.valueCell}>
          {copy.progress.compare.after}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.changeCell}>
          {copy.progress.compare.changeColumn}
        </Text>
      </View>

      {rows.map((row) => {
        const change = describeChange(row.to - row.from);
        return (
          <View
            key={row.key}
            style={styles.row}
            accessible
            accessibilityLabel={copy.progress.compare.scoreRow(
              row.label,
              row.from,
              row.to,
              change.text,
            )}
          >
            <Text variant={row.key === 'overall' ? 'label' : 'bodySmall'} style={styles.labelCell}>
              {row.label}
            </Text>
            <Text variant="bodySmall" color="textSecondary" style={styles.valueCell}>
              {row.from}
            </Text>
            <Text variant="label" style={styles.valueCell}>
              {row.to}
            </Text>
            <View style={[styles.changeCell, styles.change]}>
              <Icon name={change.icon} size={sizes.icon.sm} color={change.color} />
              <Text variant="bodySmall">{change.text}</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headingRow: {
    paddingBottom: spacing.xs,
    borderBottomWidth: sizes.borderWidth,
  },
  labelCell: {
    flex: 3,
  },
  valueCell: {
    flex: 2,
    textAlign: 'right',
  },
  changeCell: {
    flex: 3,
  },
  change: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
