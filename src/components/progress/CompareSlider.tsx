import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { COMPARE_FRAME_ASPECT, COMPARE_STEP } from '@/constants/progress';
import { cameraColors, compareSlider, motion, radius, sizes, spacing } from '@/theme/tokens';

import { ScanPhoto } from './ScanPhoto';

export interface CompareSliderProps {
  beforePath: string;
  afterPath: string;
}

function clampFraction(value: number): number {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

/**
 * Wipes between two scan photos. "Before" shows left of the divider and
 * "after" to the right; drag the divider, or tap to jump it there. Both
 * photos fill the same 3:4 frame, cropped rather than stretched, so they
 * line up. The drag runs on the UI thread, so it keeps up with a finger.
 */
export function CompareSlider({ beforePath, afterPath }: CompareSliderProps) {
  const [width, setWidth] = useState(0);
  // Where the divider sits, as a fraction of the width.
  const split = useSharedValue(0.5);
  // The same position for screen readers, updated when a drag ends.
  const [percent, setPercent] = useState(50);
  const height = width / COMPARE_FRAME_ASPECT;

  const gesture = useMemo(() => {
    const report = (fraction: number) => {
      'worklet';
      scheduleOnRN(setPercent, Math.round(fraction * 100));
    };
    const pan = Gesture.Pan()
      // Horizontal drags move the divider; vertical ones are left to the page's scroll.
      .activeOffsetX([-motion.swipe.activation, motion.swipe.activation])
      .failOffsetY([-motion.swipe.activation, motion.swipe.activation])
      .onUpdate((event) => {
        if (width > 0) split.set(clampFraction(event.x / width));
      })
      .onEnd(() => report(split.get()));
    const tap = Gesture.Tap().onEnd((event) => {
      if (width === 0) return;
      const target = clampFraction(event.x / width);
      split.set(withTiming(target, { duration: motion.duration.base }));
      report(target);
    });
    return Gesture.Race(pan, tap);
  }, [split, width]);

  const beforeStyle = useAnimatedStyle(() => ({ width: split.get() * width }));
  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: split.get() * width - compareSlider.handle / 2 }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const step = event.nativeEvent.actionName === 'increment' ? COMPARE_STEP : -COMPARE_STEP;
    const target = clampFraction(split.get() + step);
    split.set(withTiming(target, { duration: motion.duration.base }));
    setPercent(Math.round(target * 100));
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.frame}
        onLayout={handleLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={copy.progress.compare.sliderLabel}
        accessibilityValue={{ text: copy.progress.compare.sliderValue(percent) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={handleAccessibilityAction}
      >
        {width > 0 ? (
          <>
            <ScanPhoto path={afterPath} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.beforeClip, beforeStyle]}>
              {/* Full width inside the clip, so the photo is cropped, never squeezed. */}
              <ScanPhoto path={beforePath} style={{ width, height }} />
            </Animated.View>

            <Animated.View style={[styles.handleTrack, handleStyle]} pointerEvents="none">
              <View style={styles.divider} />
              <View style={styles.handle}>
                <Icon name="drag" size={sizes.icon.md} tint={cameraColors.text} />
              </View>
            </Animated.View>

            <PhotoLabel text={copy.progress.compare.before} side="left" />
            <PhotoLabel text={copy.progress.compare.after} side="right" />
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
}

function PhotoLabel({ text, side }: { text: string; side: 'left' | 'right' }) {
  return (
    <View
      style={[styles.label, side === 'left' ? styles.labelLeft : styles.labelRight]}
      pointerEvents="none"
    >
      <Text variant="label" style={styles.labelText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: COMPARE_FRAME_ASPECT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: cameraColors.background,
  },
  beforeClip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  handleTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: compareSlider.handle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: compareSlider.divider,
    backgroundColor: cameraColors.text,
  },
  handle: {
    width: compareSlider.handle,
    height: compareSlider.handle,
    borderRadius: radius.full,
    borderWidth: compareSlider.handleBorder,
    borderColor: cameraColors.text,
    backgroundColor: cameraColors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: cameraColors.control,
  },
  labelLeft: {
    left: spacing.sm,
  },
  labelRight: {
    right: spacing.sm,
  },
  labelText: {
    color: cameraColors.text,
  },
});
