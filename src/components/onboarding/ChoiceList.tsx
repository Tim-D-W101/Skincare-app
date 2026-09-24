import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { hapticSelection } from '@/lib/haptics';
import { radius, sizes, spacing, useColors } from '@/theme/tokens';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** A short plain-language line under the label. */
  description?: string;
}

export interface ChoiceListProps<T extends string> {
  options: readonly ChoiceOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  /** Names the group for screen readers, usually the question. */
  accessibilityLabel: string;
}

/** A single-select list of full-width options. Announced as a radio group. */
export function ChoiceList<T extends string>({
  options,
  selected,
  onSelect,
  accessibilityLabel,
}: ChoiceListProps<T>) {
  return (
    <View
      style={styles.list}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => (
        <ChoiceRow
          key={option.value}
          label={option.label}
          description={option.description}
          selected={option.value === selected}
          onPress={() => onSelect(option.value)}
        />
      ))}
    </View>
  );
}

interface ChoiceRowProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

function ChoiceRow({ label, description, selected, onPress }: ChoiceRowProps) {
  const palette = useColors();

  const handlePress = () => {
    hapticSelection();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: selected || pressed ? palette.accentSubtle : palette.surface,
          borderColor: selected ? palette.accent : palette.border,
        },
      ]}
    >
      <View style={styles.text}>
        <Text color={selected ? 'accent' : 'textPrimary'}>{label}</Text>
        {description ? (
          <Text variant="bodySmall" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.indicator,
          {
            borderColor: selected ? palette.accent : palette.border,
            backgroundColor: selected ? palette.accent : palette.surface,
          },
        ]}
      >
        {selected ? <Icon name="check" size={sizes.icon.sm} color="textInverse" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  indicator: {
    width: sizes.icon.lg,
    height: sizes.icon.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: sizes.borderWidth,
  },
});
