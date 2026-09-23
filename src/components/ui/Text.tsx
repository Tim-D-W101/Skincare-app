import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { typography, useColors, type ColorName, type TypographyVariant } from '@/theme/tokens';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorName;
  align?: TextStyle['textAlign'];
}

/** All text in the app renders through this, so type and colour always come from tokens. */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  ...rest
}: TextProps) {
  const palette = useColors();

  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: palette[color], textAlign: align }, style]}
    />
  );
}
