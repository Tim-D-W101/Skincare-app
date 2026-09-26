import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

import { revealProgress } from './useResultReveal';

export interface RevealProps {
  children: ReactNode;
  /** The reveal clock from useResultReveal. */
  clock: SharedValue<number>;
  /** When this part starts to appear, in milliseconds from arrival. */
  at: number;
  style?: StyleProp<ViewStyle>;
}

/** Fades its content in and lifts it into place when the reveal clock reaches `at`. */
export function Reveal({ children, clock, at, style }: RevealProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = revealProgress(clock.value, at, motion.results.fade);
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * motion.results.rise }],
    };
  });

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
