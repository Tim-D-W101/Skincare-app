import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing, useColors } from '@/theme/tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Wraps the content in a ScrollView. */
  scroll?: boolean;
  /** Lifts content above the on-screen keyboard. Use on screens with text inputs. */
  keyboardAvoiding?: boolean;
  /** Applies the standard screen gutter. On by default. */
  padded?: boolean;
  /** Safe-area edges to inset. Defaults to all four. */
  edges?: readonly Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

/** The outer layout for every screen: safe area, background, optional scroll and keyboard handling. */
export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  edges = ALL_EDGES,
  contentStyle,
}: ScreenProps) {
  const palette = useColors();
  const padding = padded ? styles.padded : null;

  const content = scroll ? (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[padding, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padding, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: palette.background }]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.fill} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  padded: {
    padding: spacing.md,
  },
});
