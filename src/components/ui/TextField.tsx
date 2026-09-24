import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, sizes, spacing, typography, useColors } from '@/theme/tokens';

import { Text } from './Text';

export interface TextFieldProps extends Omit<
  TextInputProps,
  'style' | 'placeholderTextColor' | 'selectionColor' | 'accessibilityLabel'
> {
  label: string;
  /** Shown under the field, and outlines it in the danger colour. */
  error?: string | null;
}

/** A labelled single-line text input. */
export function TextField({ label, error, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const palette = useColors();
  const [focused, setFocused] = useState(false);

  let borderColor = palette.border;
  if (error) borderColor = palette.danger;
  else if (focused) borderColor = palette.accent;

  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={error ?? undefined}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        placeholderTextColor={palette.textTertiary}
        selectionColor={palette.accent}
        style={[
          styles.input,
          {
            color: palette.textPrimary,
            backgroundColor: palette.surfaceElevated,
            borderColor,
          },
        ]}
      />
      {error ? (
        <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  input: {
    // lineHeight is left out on purpose: Android misplaces text vertically in a
    // single-line input that sets one.
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    minHeight: sizes.control.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: sizes.borderWidth,
  },
});
