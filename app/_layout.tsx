import { Stack } from 'expo-router';

/**
 * Root layout. Structure only — screens arrive in later phases.
 */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
