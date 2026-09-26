import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { radius, sizes, spacing, useColors } from '@/theme/tokens';
import type { AttributeKey } from '@/types/scan';

export interface ResultFocusProps {
  focusAreas: AttributeKey[];
  scores: Record<AttributeKey, number>;
}

/**
 * The one to three attributes to prioritise, set apart from the other scores
 * and framed as room to improve, never as a shortfall.
 */
export function ResultFocus({ focusAreas, scores }: ResultFocusProps) {
  const palette = useColors();

  return (
    <View style={[styles.container, { backgroundColor: palette.accentSubtle }]}>
      <View style={styles.header}>
        <Icon name="sparkle" size={sizes.icon.md} color="accent" />
        <Text variant="h3" accessibilityRole="header">
          {copy.results.focusTitle}
        </Text>
      </View>
      <View style={styles.areas}>
        {focusAreas.map((key) => (
          <View
            key={key}
            style={[
              styles.area,
              { backgroundColor: palette.surfaceElevated, borderColor: palette.accent },
            ]}
            accessible
            accessibilityLabel={`${copy.results.attributes[key]}, ${scores[key]}`}
          >
            <Text variant="label">{copy.results.attributes[key]}</Text>
            <Text variant="label" color="accent">
              {scores[key]}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="bodySmall" color="textSecondary">
        {copy.results.lowScoreNote}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  areas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  area: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.chip,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: sizes.borderWidth,
  },
});
