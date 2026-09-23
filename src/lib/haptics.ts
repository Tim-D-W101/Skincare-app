import * as Haptics from 'expo-haptics';

/**
 * Fire-and-forget haptic feedback.
 *
 * Haptics are decoration: a device without a vibration motor, or one with
 * haptics switched off, should behave exactly as if the tap succeeded. So a
 * failure is logged in development and never surfaced to the user.
 */
export function hapticImpact(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(logHapticFailure);
}

export function hapticSelection(): void {
  Haptics.selectionAsync().catch(logHapticFailure);
}

function logHapticFailure(error: unknown): void {
  if (__DEV__) {
    console.warn('Haptic feedback failed', error);
  }
}
