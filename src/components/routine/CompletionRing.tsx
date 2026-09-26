import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { sizes, spacing, useColors } from '@/theme/tokens';

export interface CompletionRingProps {
  done: number;
  total: number;
}

/** Today's routine as a ring that fills step by step, with the count in the middle. */
export function CompletionRing({ done, total }: CompletionRingProps) {
  const palette = useColors();
  const size = sizes.scoreRing.md;
  const stroke = sizes.scoreRingStroke.md;
  const center = size / 2;
  const ringRadius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const fraction = total > 0 ? Math.min(1, done / total) : 0;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={copy.routine.title}
      accessibilityValue={{
        min: 0,
        max: total,
        now: done,
        text: copy.routine.completion(done, total),
      }}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={ringRadius}
            stroke={palette.borderSubtle}
            strokeWidth={stroke}
            fill="none"
          />
          {fraction > 0 ? (
            <Circle
              cx={center}
              cy={center}
              r={ringRadius}
              stroke={palette.accent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - fraction)}
              fill="none"
              transform={`rotate(-90 ${center} ${center})`}
            />
          ) : null}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text variant="h2">{copy.routine.ringValue(done, total)}</Text>
        </View>
      </View>
      <Text color="textSecondary">{copy.routine.completion(done, total)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
