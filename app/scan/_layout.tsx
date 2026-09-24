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
    />
  );
}
