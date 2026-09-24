import { Stack } from 'expo-router';

import { useColors } from '@/theme/tokens';

export default function AuthLayout() {
  const palette = useColors();

  return (
    <Stack
      screenOptions={{
        title: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.textPrimary,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="check-email" />
      <Stack.Screen name="callback" options={{ headerShown: false }} />
    </Stack>
  );
}
