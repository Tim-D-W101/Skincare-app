import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { StartupScreen } from '@/components/auth/StartupScreen';
import { isOnboarded } from '@/lib/onboarding';
import { useAuthStore } from '@/stores/useAuthStore';
import { useColors } from '@/theme/tokens';

/**
 * Root layout.
 *
 * Nothing routes until a session exists: on launch the auth store restores the
 * stored session or signs in anonymously, and until that resolves this shows
 * the startup screen (with a retry if it fails).
 *
 * The guards then decide what is reachable. Until onboarding is complete only
 * the onboarding flow is; afterwards only the tabs are. When a guard flips, the
 * router moves to the first reachable group listed below.
 */
export default function RootLayout() {
  const palette = useColors();
  const initialise = useAuthStore((state) => state.initialise);
  const isLoading = useAuthStore((state) => state.isLoading);
  const startupError = useAuthStore((state) => state.startupError);
  const hasProfile = useAuthStore((state) => state.session !== null && state.profile !== null);
  const onboarded = useAuthStore((state) => isOnboarded(state.profile));

  useEffect(() => {
    void initialise();
  }, [initialise]);

  let content;
  if (startupError) {
    content = <StartupScreen error={startupError} onRetry={() => void initialise()} />;
  } else if (isLoading || !hasProfile) {
    content = <StartupScreen />;
  } else {
    content = (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom' }} />
        </Stack.Protected>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      {content}
    </>
  );
}
