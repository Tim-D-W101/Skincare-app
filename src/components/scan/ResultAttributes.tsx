import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Card, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ATTRIBUTE_KEYS } from '@/constants/scan';
import { getScoreColor, motion, radius, sizes, spacing, useColors } from '@/theme/tokens';
import type { AttributeKey } from '@/types/scan';

import { Reveal } from './Reveal';
import { revealProgress } from './useResultReveal';

export interface ResultAttributesProps {
  scores: Record<AttributeKey, number>;
  clock: SharedValue<number>;
}

/** The seven attribute scores as bars, arriving one after another. */
export function ResultAttributes({ scores, clock }: ResultAttributesProps) {
  return (
    <Card style={styles.card}>
      {ATTRIBUTE_KEYS.map((key, index) => (
        <AttributeBar
          key={key}
          label={copy.results.attributes[key]}
          score={scores[key]}
          clock={clock}
          at={motion.results.attributesAt + index * motion.results.attributeStagger}
        />
      ))}
    </Card>
  );
}

function AttributeBar({
  label,
  score,
  clock,
  at,
}: {
  label: string;
  score: number;
  clock: SharedValue<number>;
  at: number;
}) {
  const palette = useColors();

  const fillStyle = useAnimatedStyle(() => ({
    width: `${revealProgress(clock.value, at, motion.results.attributeFill) * score}%`,
  }));

  return (
    <Reveal clock={clock} at={at}>
      <View style={styles.row} accessible accessibilityLabel={`${label}, ${score}`}>
        <View style={styles.labels}>
          <Text variant="bodySmall">{label}</Text>
          <Text variant="label">{score}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: palette.borderSubtle }]}>
          <Animated.View
            style={[styles.fill, { backgroundColor: getScoreColor(score, palette) }, fillStyle]}
          />
        </View>
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  track: {
    height: sizes.scoreBar,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
