import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

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
  /**
   * Sweeps the ring from 0 and counts the number up. When false, renders the
   * final state. Ignored when `progress` is given.
   */
  animate?: boolean;
  /**
   * Drives the sweep from outside, from 0 (empty) to 1 (the full score), so
   * the ring can be one part of a longer sequence.
   */
  progress?: SharedValue<number>;
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
  progress,
}: ScoreRingProps) {
  const palette = useColors();
  const target = clampScore(score);
  const ownProgress = useSharedValue(animate ? 0 : 1);
  const sweep = progress ?? ownProgress;
  // Read once, on the first render, so a ring that starts full shows its number straight away.
  const [counted, setCounted] = useState(() => Math.round(sweep.get() * target));

  useEffect(() => {
    if (progress) return;
    if (!animate) {
      cancelAnimation(ownProgress);
      ownProgress.set(1);
      return;
    }
    ownProgress.set(0);
    ownProgress.set(
      withTiming(1, {
        duration: motion.duration.reveal,
        easing: Easing.bezier(...motion.easing.decelerate),
      }),
    );
    return () => cancelAnimation(ownProgress);
  }, [animate, progress, ownProgress, target]);

  // The number follows the sweep. It only crosses to the JS thread when the whole number changes.
  useAnimatedReaction(
    () => Math.round(sweep.value * target),
    (value, previous) => {
      if (value !== previous) scheduleOnRN(setCounted, value);
    },
    [sweep, target],
  );

  const center = size / 2;
  const ringRadius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const fraction = target / 100;

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - sweep.value * fraction),
  }));

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
            animatedProps={arcProps}
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text variant={numberVariantFor(size)}>{counted}</Text>
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
