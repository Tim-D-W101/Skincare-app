import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useColors } from '@/theme/tokens';

/**
 * Root layout. Structure only — screens arrive in later phases.
 */
export default function RootLayout() {
  const palette = useColors();

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </>
  );
}
