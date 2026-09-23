import Svg, { Circle, Path } from 'react-native-svg';

import { sizes, useColors, type ColorName } from '@/theme/tokens';

export type IconName = 'info' | 'alert' | 'sparkle' | 'refresh' | 'check' | 'plus';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorName;
}

/**
 * A small set of line icons drawn on a 24-unit grid. Icons are decorative and
 * hidden from screen readers; the text beside them carries the meaning.
 */
export function Icon({ name, size = sizes.icon.md, color = 'textSecondary' }: IconProps) {
  const palette = useColors();
  const stroke = palette[color];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={sizes.iconStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {renderGlyph(name)}
    </Svg>
  );
}

function renderGlyph(name: IconName) {
  switch (name) {
    case 'info':
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 11v5" />
          <Path d="M12 8h.01" />
        </>
      );
    case 'alert':
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7.5v5" />
          <Path d="M12 16h.01" />
        </>
      );
    case 'sparkle':
      return <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />;
    case 'refresh':
      return (
        <>
          <Path d="M20 11a8 8 0 1 0-2.3 5.7" />
          <Path d="M20 5v6h-6" />
        </>
      );
    case 'check':
      return <Path d="M5 12.5l4.5 4.5L19 7.5" />;
    case 'plus':
      return <Path d="M12 5v14M5 12h14" />;
  }
}
