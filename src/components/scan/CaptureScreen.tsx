import { CameraView } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, Screen } from '@/components/ui';
import { copy } from '@/constants/copy';
import { captureQuality, choosePictureSize, pickGuidance, processPhoto } from '@/lib/capture';
import { logInDevelopment } from '@/lib/errors';
import { hapticImpact } from '@/lib/haptics';
import { useScanStore } from '@/stores/useScanStore';
import { cameraColors, spacing } from '@/theme/tokens';
import type { CameraFacing } from '@/types/scan';

import { CameraMessage, ControlButton, ControlPill, ShutterButton } from './CameraControls';
import { CameraPermissionGate } from './CameraPermissionGate';
import { FaceOval } from './FaceOval';
import { TipsSheet } from './TipsSheet';
import { useAppActive, useLightMeter, useSteadiness } from './useCaptureChecks';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * The scan camera. Guidance checks the light on the face and that the phone
 * is still, and the shutter only works once both are good, so photos stay
 * comparable from week to week.
 */
export function CaptureScreen() {
  return (
    <CameraPermissionGate>
      <CaptureView />
    </CameraPermissionGate>
  );
}

function CaptureView() {
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const setCapture = useScanStore((state) => state.setCapture);

  const [view, setView] = useState({ width: 0, height: 0 });
  const [facing, setFacing] = useState<CameraFacing>('front');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);

  // The camera only runs while this screen is visible and the app is open.
  const active = isFocused && appActive;
  const meter = useLightMeter(
    cameraRef,
    view.width,
    view.height,
    active && cameraReady && !capturing,
  );
  const steadiness = useSteadiness(active);
  const guidance = pickGuidance(meter.level, steadiness.steady);
  const canCapture = cameraReady && guidance === 'good';

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setView({ width, height });
  };

  // Fires each time the camera opens: at start, after a flip, after a size change.
  const handleCameraReady = async () => {
    setCameraReady(true);
    try {
      const sizes = await cameraRef.current?.getAvailablePictureSizesAsync();
      const chosen = sizes ? choosePictureSize(sizes) : null;
      if (chosen) setPictureSize(chosen);
    } catch (sizeError: unknown) {
      // Not fatal: the camera keeps its default size.
      logInDevelopment('Could not read picture sizes', sizeError);
    }
  };

  const flip = () => {
    setCameraReady(false);
    setFacing((current) => (current === 'front' ? 'back' : 'front'));
  };

  const retryCamera = () => {
    setCameraFailed(false);
    setCameraReady(false);
    setCameraKey((key) => key + 1);
  };

  const capture = async () => {
    const cameraView = cameraRef.current;
    if (!cameraView || !canCapture || capturing) return;

    hapticImpact();
    setCapturing(true);
    setError(null);
    try {
      await meter.settle();
      const picture = await cameraView.takePictureAsync({ pictureRef: true });
      const photo = await processPhoto(picture);
      setCapture({
        ...photo,
        quality: captureQuality(meter.luminance, steadiness.readMotion(), facing),
      });
      router.push('/scan/confirm');
    } catch (captureError: unknown) {
      logInDevelopment('Capture failed', captureError);
      setError(copy.scan.capture.failed);
    } finally {
      setCapturing(false);
    }
  };

  if (cameraFailed) {
    return (
      <Screen contentStyle={styles.centered}>
        <ErrorState message={copy.scan.capture.cameraError} onRetry={retryCamera} />
      </Screen>
    );
  }

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {/* Light icons over the camera, but only while it's on screen: this view
          stays mounted under the confirm screen. */}
      {isFocused ? <StatusBar style="light" /> : null}
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        active={active}
        animateShutter={false}
        pictureSize={pictureSize}
        onCameraReady={() => void handleCameraReady()}
        onMountError={(event) => {
          logInDevelopment('Camera failed to start', event.message);
          setCameraFailed(true);
        }}
      />

      {view.width > 0 ? (
        <FaceOval width={view.width} height={view.height} ready={canCapture} />
      ) : null}

      <View
        style={[
          StyleSheet.absoluteFill,
          styles.chrome,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <View style={styles.topBar}>
          <ControlButton icon="close" label={copy.common.close} onPress={leave} />
          <ControlButton
            icon="flip"
            label={copy.scan.capture.flipCamera}
            onPress={flip}
            disabled={capturing}
          />
        </View>

        <View style={styles.bottom}>
          {error ? <CameraMessage message={error} /> : null}
          <CameraMessage message={copy.scan.guidance[guidance]} />
          <View style={styles.shutterRow}>
            <View style={styles.side}>
              <ControlPill
                label={copy.scan.capture.why}
                onPress={() => setTipsOpen(true)}
                accessibilityHint={copy.scan.tips.title}
              />
            </View>
            <ShutterButton onPress={() => void capture()} disabled={!canCapture} busy={capturing} />
            <View style={styles.side} />
          </View>
        </View>
      </View>

      <TipsSheet visible={tipsOpen} onClose={() => setTipsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: cameraColors.background,
  },
  centered: {
    justifyContent: 'center',
  },
  chrome: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottom: {
    gap: spacing.md,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
  },
});
