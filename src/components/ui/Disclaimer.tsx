import { StyleSheet, View } from 'react-native';

import { copy } from '@/constants/copy';
import { radius, sizes, spacing, useColors } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

export interface DisclaimerProps {
  /** `short` sits under every score; `full` goes on the results screen and in settings. */
  variant?: 'short' | 'full';
}

/**
 * The cosmetic-estimate notice. Required on every screen that shows a score.
 * Always visible and never collapsible: quiet in tone, but not hidden.
 */
export function Disclaimer({ variant = 'short' }: DisclaimerProps) {
  const palette = useColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.borderSubtle },
      ]}
      accessible
      accessibilityRole="text"
    >
      <Icon name="info" size={sizes.icon.sm} color="textSecondary" />
      <Text
        variant={variant === 'full' ? 'bodySmall' : 'caption'}
        color="textSecondary"
        style={styles.text}
      >
        {copy.disclaimers[variant]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
  },
  text: {
    flex: 1,
  },
});
