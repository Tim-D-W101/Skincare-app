import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/lib/useReduceMotion';
import { motion, scanSweep } from '@/theme/tokens';

export interface ScanSweepProps {
  /** Height of the photo the band travels over. */
  height: number;
}

/**
 * A soft band that drifts down the photo while it's analysed. Decorative:
 * hidden from screen readers, and not drawn at all with reduce motion on.
 */
export function ScanSweep({ height }: ScanSweepProps) {
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const bandHeight = height * scanSweep.band;
  const visible = !reduceMotion && height > 0;

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration.sweep,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, visible]);

  if (!visible) return null;

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandHeight, height],
  });

  return (
    <Animated.View
      style={[styles.band, { height: bandHeight, transform: [{ translateY }] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="scan-sweep" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={scanSweep.color} stopOpacity={0} />
            <Stop offset="0.5" stopColor={scanSweep.color} stopOpacity={scanSweep.peakOpacity} />
            <Stop offset="1" stopColor={scanSweep.color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#scan-sweep)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none',
  },
});
