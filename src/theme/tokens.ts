/**
 * Design tokens — the single source of truth for every visual value in the app.
 *
 * Nothing in the app may use a hardcoded colour, spacing value, radius or font
 * size. Every component imports from this file. Changing the look of the app
 * means editing values here, never hunting through components.
 */
import { Platform, useColorScheme } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/**
 * Five steps from low (index 0) to high (index 4). One hue — the accent teal —
 * stepped by lightness, so the order reads for everyone, including people with
 * colour-vision deficiency, without relying on hue at all. Light mode runs
 * pale to deep; dark mode flips so the high end is the brightest.
 *
 * Low scores are deliberately quiet, never red. The status colours (success,
 * warning, danger) are reserved for actions and states and are never used for
 * scores.
 */
export type ScoreScale = readonly [string, string, string, string, string];

export interface ColorPalette {
  /** Screen background — warm paper in light mode, deep ink in dark mode. */
  background: string;
  /** Cards and grouped content sitting on the background. */
  surface: string;
  /** Sheets, menus and anything floating above a surface. */
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  /** Captions and hints. Still meets 4.5:1 on every surface. */
  textTertiary: string;
  /** Text on accent or danger fills. */
  textInverse: string;
  accent: string;
  accentSubtle: string;
  accentPressed: string;
  success: string;
  warning: string;
  danger: string;
  score: ScoreScale;
}

/** Semantic colour names usable for text and fills (everything except the score scale). */
export type ColorName = Exclude<keyof ColorPalette, 'score'>;

export type ColorSchemeName = 'light' | 'dark';

const lightColors: ColorPalette = {
  background: '#F8F5F1',
  surface: '#FDFCF9',
  surfaceElevated: '#FFFFFF',
  border: '#D3D1CB',
  borderSubtle: '#E8E6E2',
  textPrimary: '#151C1A',
  textSecondary: '#474F4C',
  textTertiary: '#646B68',
  textInverse: '#FFFFFF',
  accent: '#1D655D',
  accentSubtle: '#DDF2EF',
  accentPressed: '#0A504A',
  success: '#2B7440',
  warning: '#A0600B',
  danger: '#AF3D34',
  score: ['#92BBB5', '#68A098', '#42857D', '#236961', '#054D47'],
};

const darkColors: ColorPalette = {
  background: '#0D100F',
  surface: '#151918',
  surfaceElevated: '#1E2321',
  border: '#363C3A',
  borderSubtle: '#252A28',
  textPrimary: '#EDEBE7',
  textSecondary: '#BDBAB5',
  textTertiary: '#979590',
  textInverse: '#0D100F',
  accent: '#70BFB4',
  accentSubtle: '#1C3330',
  accentPressed: '#5FA89E',
  success: '#73C385',
  warning: '#EBB25F',
  danger: '#E8796C',
  score: ['#3A605B', '#477F78', '#5A9D95', '#73BCB2', '#96DAD0'],
};

export const colors: Record<ColorSchemeName, ColorPalette> = {
  light: lightColors,
  dark: darkColors,
};

/** Returns the palette for the device's current light/dark setting. */
export function useColors(): ColorPalette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colors.dark : colors.light;
}

/** Maps a 0-100 score onto the five-step score scale in equal bands. */
export function getScoreColor(score: number, palette: ColorPalette): string {
  const steps = palette.score.length;
  const clamped = Math.min(100, Math.max(0, score));
  const index = Math.min(steps - 1, Math.floor(clamped / (100 / steps)));
  return palette.score[index];
}

// ---------------------------------------------------------------------------
// Spacing and radius
// ---------------------------------------------------------------------------

/** 4pt scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

// ---------------------------------------------------------------------------
// Component sizing and opacity
// ---------------------------------------------------------------------------

export const sizes = {
  /** Minimum touch target for anything tappable. Smaller controls get hitSlop to reach it. */
  minTouchTarget: 44,
  control: { sm: 36, md: 44, lg: 52 },
  chip: 36,
  icon: { sm: 16, md: 20, lg: 24, xl: 40 },
  iconStroke: 1.75,
  borderWidth: 1,
  scoreRing: { sm: 64, md: 120, lg: 180 },
  scoreRingStroke: { sm: 6, md: 10, lg: 14 },
  skeletonLine: 14,
  /** Width of the last skeleton line, so the block reads as a paragraph. */
  skeletonShortLine: '60%',
} as const;

export const opacity = {
  disabled: 0.4,
  skeletonLow: 0.4,
  skeletonHigh: 1,
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

const SYSTEM_FONT = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

/**
 * Font families by weight. All system font for now. To adopt a custom font,
 * load it and replace these values — every text style below picks it up.
 */
export const fontFamilies = {
  regular: SYSTEM_FONT,
  medium: SYSTEM_FONT,
  semibold: SYSTEM_FONT,
  bold: SYSTEM_FONT,
} as const;

export type TypographyVariant =
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label';

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
}

export const typography: Record<TypographyVariant, TypographyStyle> = {
  display: { fontFamily: fontFamilies.bold, fontSize: 40, lineHeight: 48, fontWeight: '700' },
  h1: { fontFamily: fontFamilies.bold, fontSize: 30, lineHeight: 38, fontWeight: '700' },
  h2: { fontFamily: fontFamilies.semibold, fontSize: 24, lineHeight: 32, fontWeight: '600' },
  h3: { fontFamily: fontFamilies.semibold, fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySmall: { fontFamily: fontFamilies.regular, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontFamily: fontFamilies.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  label: { fontFamily: fontFamilies.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
};

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

export type ShadowLevel = 'sm' | 'md' | 'lg';

export type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const SHADOW_COLOR = '#0D100F';

/** Android reads `elevation`; iOS reads the shadow* properties. Each level sets both. */
export const shadows: Record<ShadowLevel, ShadowStyle> = {
  sm: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
};

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * Durations in milliseconds. Easing curves are cubic-bezier control points,
 * used as `Easing.bezier(...motion.easing.standard)` — the same call works
 * with Reanimated and with React Native's built-in Animated.
 */
export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    /** The score ring sweep and count-up. */
    reveal: 900,
    /** One half-cycle of the skeleton pulse. */
    pulse: 800,
  },
  /** Scale applied to a button while pressed. */
  pressScale: 0.97,
  easing: {
    /** Most on-screen movement: quick start, gentle settle. */
    standard: [0.2, 0, 0, 1],
    /** Elements arriving on screen. */
    decelerate: [0, 0, 0, 1],
    /** Elements leaving the screen. */
    accelerate: [0.3, 0, 1, 1],
  },
} as const;
