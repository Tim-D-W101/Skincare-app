import { Stack } from 'expo-router';

import { useColors } from '@/theme/tokens';

export default function ScanLayout() {
  const palette = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen name="capture" />
      <Stack.Screen name="confirm" />
      {/* Leaving these goes home, handled by the screens themselves, not a swipe back. */}
      <Stack.Screen name="analysing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="result" options={{ gestureEnabled: false }} />
      <Stack.Screen name="share" options={{ presentation: 'modal' }} />
      <Stack.Screen name="reminders" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
