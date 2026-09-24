import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { copy } from '@/constants/copy';
import { camera, cameraColors, motion, opacity, radius, sizes, spacing } from '@/theme/tokens';

/**
 * Controls drawn over the camera feed. They use the fixed camera colours, not
 * the light/dark palette, because the feed behind them doesn't change.
 */

export interface ControlButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** A round icon button. */
export function ControlButton({ icon, label, onPress, disabled = false }: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.round,
        { opacity: disabled ? opacity.disabled : 1 },
        pressed ? styles.pressed : null,
      ]}
    >
      <Icon name={icon} size={sizes.icon.lg} tint={cameraColors.text} />
    </Pressable>
  );
}

export interface ControlPillProps {
  label: string;
  onPress: () => void;
  accessibilityHint?: string;
}

/** A small text button. */
export function ControlPill({ label, onPress, accessibilityHint }: ControlPillProps) {
  const verticalSlop = Math.max(0, (sizes.minTouchTarget - sizes.control.sm) / 2);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: verticalSlop, bottom: verticalSlop }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.pill, pressed ? styles.pressed : null]}
    >
      <Text variant="label" style={styles.lightText}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface CameraMessageProps {
  message: string;
}

/** The live guidance line. Announced whenever it changes. */
export function CameraMessage({ message }: CameraMessageProps) {
  return (
    <View style={styles.message} accessibilityLiveRegion="polite">
      <Text variant="body" align="center" style={styles.lightText}>
        {message}
      </Text>
    </View>
  );
}

export interface ShutterButtonProps {
  onPress: () => void;
  disabled: boolean;
  /** Shows a spinner while the photo is taken and processed. */
  busy: boolean;
}

export function ShutterButton({ onPress, disabled, busy }: ShutterButtonProps) {
  const inactive = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={busy ? copy.scan.capture.processing : copy.scan.capture.shutter}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.shutter,
        { opacity: disabled && !busy ? opacity.disabled : 1 },
        { transform: [{ scale: pressed ? motion.pressScale : 1 }] },
      ]}
    >
      <View style={styles.shutterCore}>
        {busy ? <ActivityIndicator color={cameraColors.background} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: sizes.minTouchTarget,
    height: sizes.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: cameraColors.control,
  },
  pill: {
    minHeight: sizes.control.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: cameraColors.control,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  message: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: cameraColors.control,
  },
  lightText: {
    color: cameraColors.text,
  },
  shutter: {
    width: camera.shutter,
    height: camera.shutter,
    padding: spacing.xs,
    borderRadius: radius.full,
    borderWidth: camera.shutterRing,
    borderColor: cameraColors.shutter,
  },
  shutterCore: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: cameraColors.shutter,
  },
});
