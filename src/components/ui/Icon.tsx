import Svg, { Circle, Path } from 'react-native-svg';

import { sizes, useColors, type ColorName } from '@/theme/tokens';

export type IconName =
  | 'info'
  | 'alert'
  | 'sparkle'
  | 'refresh'
  | 'check'
  | 'plus'
  | 'back'
  | 'home'
  | 'settings'
  | 'close'
  | 'flip'
  | 'arrowUp'
  | 'arrowDown'
  | 'minus'
  | 'share'
  | 'chart'
  | 'drag';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorName;
  /** A raw colour that overrides `color`, for icons over a camera feed where theme colours don't apply. */
  tint?: string;
}

/**
 * A small set of line icons drawn on a 24-unit grid. Icons are decorative and
 * hidden from screen readers; the text beside them carries the meaning.
 */
export function Icon({ name, size = sizes.icon.md, color = 'textSecondary', tint }: IconProps) {
  const palette = useColors();
  const stroke = tint ?? palette[color];

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
    case 'back':
      return <Path d="M15 5l-7 7 7 7" />;
    case 'home':
      return (
        <>
          <Path d="M4 11l8-7 8 7" />
          <Path d="M6 9.5V20h12V9.5" />
          <Path d="M10 20v-5h4v5" />
        </>
      );
    case 'settings':
      return (
        <>
          <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <Circle cx={15} cy={7} r={2} />
          <Circle cx={9} cy={17} r={2} />
        </>
      );
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" />;
    case 'flip':
      return (
        <>
          <Path d="M4 9a8 8 0 0 1 14-3.5L20 8" />
          <Path d="M20 4v4h-4" />
          <Path d="M20 15a8 8 0 0 1-14 3.5L4 16" />
          <Path d="M4 20v-4h4" />
        </>
      );
    case 'arrowUp':
      return <Path d="M12 19V5M6 11l6-6 6 6" />;
    case 'arrowDown':
      return <Path d="M12 5v14M6 13l6 6 6-6" />;
    case 'minus':
      return <Path d="M5 12h14" />;
    case 'drag':
      return (
        <>
          <Path d="M9 7l-5 5 5 5" />
          <Path d="M15 7l5 5-5 5" />
        </>
      );
    case 'chart':
      return (
        <>
          <Path d="M4 19h16" />
          <Path d="M5 15l4-4 3 3 7-7" />
        </>
      );
    case 'share':
      return (
        <>
          <Path d="M12 15V4" />
          <Path d="M8 8l4-4 4 4" />
          <Path d="M5 12v7h14v-7" />
        </>
      );
  }
}
