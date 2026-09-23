import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  getScoreColor,
  motion,
  sizes,
  spacing,
  useColors,
  type TypographyVariant,
} from '@/theme/tokens';

import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ScoreRingProps {
  /** 0-100. Values outside the range are clamped. */
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  /** Sweeps the ring from 0 and counts the number up. When false, renders the final state. */
  animate?: boolean;
}

function clampScore(score: number): number {
  return Math.round(Math.min(100, Math.max(0, score)));
}

function numberVariantFor(size: number): TypographyVariant {
  if (size >= sizes.scoreRing.lg) return 'display';
  if (size >= sizes.scoreRing.md) return 'h1';
  return 'label';
}

export function ScoreRing({
  score,
  size = sizes.scoreRing.md,
  strokeWidth = sizes.scoreRingStroke.md,
  label,
  animate = true,
}: ScoreRingProps) {
  const palette = useColors();
  const target = clampScore(score);
  const [progress] = useState(() => new Animated.Value(animate ? 0 : target));
  const [counted, setCounted] = useState(0);
  const displayed = animate ? counted : target;

  useEffect(() => {
    if (!animate) {
      progress.setValue(target);
      return;
    }

    progress.setValue(0);
    const listener = progress.addListener(({ value }) => setCounted(Math.round(value)));
    const sweep = Animated.timing(progress, {
      toValue: target,
      duration: motion.duration.reveal,
      easing: Easing.bezier(...motion.easing.decelerate),
      // SVG stroke props cannot run on the native driver.
      useNativeDriver: false,
    });
    sweep.start();

    return () => {
      sweep.stop();
      progress.removeListener(listener);
    };
  }, [animate, target, progress]);

  const center = size / 2;
  const ringRadius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: target }}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={ringRadius}
            stroke={palette.borderSubtle}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={ringRadius}
            stroke={getScoreColor(target, palette)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text variant={numberVariantFor(size)}>{displayed}</Text>
        </View>
      </View>
      {label ? (
        <Text variant="caption" color="textSecondary" align="center">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
