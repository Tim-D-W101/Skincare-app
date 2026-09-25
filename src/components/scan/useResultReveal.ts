import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { hapticArrival } from '@/lib/haptics';
import { motion } from '@/theme/tokens';

const settle = Easing.bezierFn(...motion.easing.decelerate);

/**
 * How far one part of the reveal has got, from 0 (not started) to 1 (in
 * place), given the clock and when that part starts and how long it takes.
 */
export function revealProgress(clock: number, startsAt: number, duration: number): number {
  'worklet';
  const linear = Math.min(1, Math.max(0, (clock - startsAt) / duration));
  return settle(linear);
}

export interface ResultReveal {
  /** Milliseconds since the screen arrived. Every animated part reads its progress from this. */
  clock: SharedValue<number>;
  /** False while anything is still moving. */
  done: boolean;
  /** Puts everything in its final place at once. */
  skip: () => void;
}

/**
 * Runs the results reveal as one timeline, so skipping it is a single jump to
 * the end. With reduce motion on, it starts at the end: nothing moves, and
 * the screen reads fully from the first frame. The haptic fires once, when the
 * overall score lands or when the reveal is skipped, whichever comes first.
 */
export function useResultReveal(duration: number): ResultReveal {
  // Reanimated reads this synchronously, so the first frame is already right.
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(reduceMotion ? duration : 0);
  const [done, setDone] = useState(reduceMotion);
  const landed = useRef(false);

  const land = useCallback(() => {
    if (landed.current) return;
    landed.current = true;
    hapticArrival();
  }, []);

  useEffect(() => {
    const timer = setTimeout(land, reduceMotion ? 0 : motion.duration.reveal);
    return () => clearTimeout(timer);
  }, [land, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    clock.set(
      withTiming(duration, { duration, easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(setDone, true);
      }),
    );
    return () => cancelAnimation(clock);
  }, [clock, duration, reduceMotion]);

  const skip = useCallback(() => {
    if (done) return;
    cancelAnimation(clock);
    clock.set(duration);
    setDone(true);
    land();
  }, [clock, done, duration, land]);

  return { clock, done, skip };
}
