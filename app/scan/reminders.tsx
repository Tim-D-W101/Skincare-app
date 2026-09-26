import { useLocalSearchParams } from 'expo-router';

import { RemindersIntroScreen } from '@/components/scan/RemindersIntroScreen';

const NEXT_ROUTES = ['/', '/routine', '/progress'] as const;

export default function Reminders() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const target = NEXT_ROUTES.find((route) => route === next) ?? '/';
  return <RemindersIntroScreen next={target} />;
}
