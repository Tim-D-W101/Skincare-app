import { Pressable, StyleSheet } from 'react-native';

import { hapticSelection } from '@/lib/haptics';
import { opacity, radius, sizes, spacing, useColors } from '@/theme/tokens';

import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** A selectable pill for multi-select lists. Announced as a checkbox. */
export function Chip({
  label,
  selected,
  onPress,
  disabled = false,
  accessibilityLabel,
}: ChipProps) {
  const palette = useColors();
  const verticalSlop = Math.max(0, (sizes.minTouchTarget - sizes.chip) / 2);

  const handlePress = () => {
    hapticSelection();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={{ top: verticalSlop, bottom: verticalSlop }}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: selected, disabled }}
      style={[
        styles.base,
        {
          backgroundColor: selected ? palette.accentSubtle : palette.surface,
          borderColor: selected ? palette.accent : palette.border,
          opacity: disabled ? opacity.disabled : 1,
        },
      ]}
    >
      <Text variant="bodySmall" color={selected ? 'accent' : 'textPrimary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: sizes.chip,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: sizes.borderWidth,
  },
});
