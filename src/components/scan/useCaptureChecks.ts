import type { CameraView } from 'expo-camera';
import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AppState } from 'react-native';

import {
  LIGHT_MAX_FAILURES,
  LIGHT_SAMPLE_INTERVAL_MS,
  LIGHT_SMOOTHING,
  MOTION_INTERVAL_MS,
  MOTION_SMOOTHING,
  MOTION_THRESHOLD,
  STEADY_AFTER_MS,
} from '@/constants/capture';
import { lightLevel, sampleFaceLuminance, type LightLevel } from '@/lib/capture';
import { logInDevelopment } from '@/lib/errors';

/** True while the app is in the foreground. */
export function useAppActive(): boolean {
  const [state, setState] = useState(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', setState);
    return () => subscription.remove();
  }, []);
  return state === 'active';
}

export interface LightMeter {
  /** Smoothed brightness of the face area (0-255), or null before the first reading. */
  luminance: number | null;
  /** 'ok' once the meter has given up, so a phone that can't be measured isn't blocked. */
  level: LightLevel;
  /** Resolves once no sample is in flight, so a capture never overlaps one. */
  settle: () => Promise<void>;
}

/**
 * Samples the brightness of the face area two to three times a second while
 * `enabled` is true.
 */
export function useLightMeter(
  cameraRef: RefObject<CameraView | null>,
  viewWidth: number,
  viewHeight: number,
  enabled: boolean,
): LightMeter {
  const [luminance, setLuminance] = useState<number | null>(null);
  const [level, setLevel] = useState<LightLevel>('unknown');
  const [gaveUp, setGaveUp] = useState(false);
  const inFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!enabled || viewWidth <= 0 || viewHeight <= 0) return;
    const view = { width: viewWidth, height: viewHeight };
    let cancelled = false;
    let failures = 0;
    let smoothed: number | null = null;
    let current: LightLevel = 'unknown';
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const cameraView = cameraRef.current;
      if (cancelled || !cameraView) return;

      const sample = sampleFaceLuminance(cameraView, view);
      inFlight.current = sample.then(
        () => undefined,
        () => undefined,
      );
      try {
        const value = await sample;
        if (cancelled) return;
        if (value === null) {
          failures += 1;
        } else {
          failures = 0;
          smoothed = smoothed === null ? value : smoothed + (value - smoothed) * LIGHT_SMOOTHING;
          current = lightLevel(smoothed, current);
          setLuminance(Math.round(smoothed));
          setLevel(current);
        }
      } catch (error: unknown) {
        failures += 1;
        logInDevelopment('Brightness sample failed', error);
      } finally {
        inFlight.current = null;
      }

      if (cancelled) return;
      if (failures >= LIGHT_MAX_FAILURES) {
        // This phone can't be sampled. Stop, and stop blocking the shutter.
        setGaveUp(true);
        return;
      }
      timer = setTimeout(() => void tick(), LIGHT_SAMPLE_INTERVAL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cameraRef, viewWidth, viewHeight, enabled]);

  const settle = useCallback(async () => {
    await inFlight.current;
  }, []);

  return { luminance, level: gaveUp ? 'ok' : level, settle };
}

export interface Steadiness {
  /** True when the phone has been still for a moment, or when it can't be measured. */
  steady: boolean;
  /** Recent movement in g, for capture_quality. Null when unavailable. */
  readMotion: () => number | null;
}

/** Watches the accelerometer while `enabled` is true. */
export function useSteadiness(enabled: boolean): Steadiness {
  const [steady, setSteady] = useState(false);
  const [available, setAvailable] = useState(true);
  const motion = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    let previous: AccelerometerMeasurement | null = null;
    let lastMovedAt = Date.now();
    let reported: boolean | null = null;

    Accelerometer.isAvailableAsync()
      .then((isAvailable) => {
        if (cancelled) return;
        if (!isAvailable) {
          setAvailable(false);
          return;
        }
        Accelerometer.setUpdateInterval(MOTION_INTERVAL_MS);
        subscription = Accelerometer.addListener((reading) => {
          const now = Date.now();
          if (previous) {
            const change = Math.hypot(
              reading.x - previous.x,
              reading.y - previous.y,
              reading.z - previous.z,
            );
            motion.current =
              motion.current === null
                ? change
                : motion.current + (change - motion.current) * MOTION_SMOOTHING;
            if (change > MOTION_THRESHOLD) lastMovedAt = now;
          }
          previous = reading;
          const isSteady = now - lastMovedAt >= STEADY_AFTER_MS;
          if (isSteady !== reported) {
            reported = isSteady;
            setSteady(isSteady);
          }
        });
      })
      .catch((error: unknown) => {
        // Without a working accelerometer the check can't run, so it stops blocking.
        logInDevelopment('Accelerometer unavailable', error);
        if (!cancelled) setAvailable(false);
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  const readMotion = useCallback(() => motion.current, []);

  return { steady: !available || steady, readMotion };
}
