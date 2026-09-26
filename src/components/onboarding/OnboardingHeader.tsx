import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { COUNTED_STEPS } from '@/lib/onboarding';
import { radius, sizes, spacing, useColors } from '@/theme/tokens';

export interface OnboardingHeaderProps {
  /** Zero-based index into ONBOARDING_STEPS. */
  stepIndex: number;
  onBack: () => void;
  backDisabled?: boolean;
}

/** Back button, "Step n of 5" and a segmented progress bar. */
export function OnboardingHeader({
  stepIndex,
  onBack,
  backDisabled = false,
}: OnboardingHeaderProps) {
  const palette = useColors();
  const counted = stepIndex < COUNTED_STEPS;
  const filled = Math.min(stepIndex + 1, COUNTED_STEPS);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {stepIndex > 0 ? (
          <Button
            label={copy.common.back}
            onPress={onBack}
            disabled={backDisabled}
            variant="ghost"
            size="sm"
            leadingIcon="back"
          />
        ) : (
          <View />
        )}
        {counted ? (
          <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
            {copy.common.stepOf(stepIndex + 1, COUNTED_STEPS)}
          </Text>
        ) : null}
      </View>

      <View
        style={styles.bar}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={copy.onboarding.progress}
        accessibilityValue={{ min: 0, max: COUNTED_STEPS, now: filled }}
      >
        {Array.from({ length: COUNTED_STEPS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              { backgroundColor: index < filled ? palette.accent : palette.borderSubtle },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.control.sm,
  },
  bar: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: sizes.progressSegment,
    borderRadius: radius.full,
  },
});
