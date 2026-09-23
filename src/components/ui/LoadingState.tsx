import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, View } from 'react-native';

import { copy } from '@/constants/copy';
import { motion, opacity, radius, sizes, spacing, useColors } from '@/theme/tokens';

export interface LoadingStateProps {
  /** `skeleton` stands in for content that is on its way; `spinner` for a short, blocking wait. */
  variant?: 'skeleton' | 'spinner';
  /** Number of skeleton lines. */
  lines?: number;
  accessibilityLabel?: string;
}

export function LoadingState({
  variant = 'skeleton',
  lines = 3,
  accessibilityLabel = copy.common.loading,
}: LoadingStateProps) {
  const palette = useColors();

  if (variant === 'spinner') {
    return (
      <View
        style={styles.spinner}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy: true }}
      >
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return <Skeleton lines={lines} accessibilityLabel={accessibilityLabel} />;
}

interface SkeletonProps {
  lines: number;
  accessibilityLabel: string;
}

function Skeleton({ lines, accessibilityLabel }: SkeletonProps) {
  const palette = useColors();
  const [pulse] = useState(() => new Animated.Value(opacity.skeletonHigh));

  useEffect(() => {
    const easing = Easing.bezier(...motion.easing.standard);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: opacity.skeletonLow,
          duration: motion.duration.pulse,
          easing,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: opacity.skeletonHigh,
          duration: motion.duration.pulse,
          easing,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.skeleton, { opacity: pulse }]}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[
            styles.line,
            { backgroundColor: palette.borderSubtle },
            index === lines - 1 && lines > 1 ? styles.shortLine : null,
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  skeleton: {
    gap: spacing.sm,
  },
  line: {
    height: sizes.skeletonLine,
    borderRadius: radius.sm,
  },
  shortLine: {
    width: sizes.skeletonShortLine,
  },
});
