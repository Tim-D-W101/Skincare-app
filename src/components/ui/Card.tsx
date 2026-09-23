import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, shadows, sizes, spacing, useColors, type ShadowLevel } from '@/theme/tokens';

export interface CardProps {
  children: ReactNode;
  padding?: keyof typeof spacing;
  radius?: keyof typeof radius;
  /** `none` renders a flat, bordered surface. */
  elevation?: ShadowLevel | 'none';
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  padding = 'md',
  radius: radiusKey = 'lg',
  elevation = 'sm',
  style,
}: CardProps) {
  const palette = useColors();
  const flat = elevation === 'none';

  return (
    <View
      style={[
        styles.base,
        {
          padding: spacing[padding],
          borderRadius: radius[radiusKey],
          backgroundColor: flat ? palette.surface : palette.surfaceElevated,
          borderColor: palette.borderSubtle,
        },
        flat ? null : shadows[elevation],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: sizes.borderWidth,
  },
});
