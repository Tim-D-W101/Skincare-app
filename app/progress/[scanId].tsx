import { Redirect, useLocalSearchParams } from 'expo-router';

import { ScanDetailScreen } from '@/components/progress/ScanDetailScreen';

export default function ScanDetail() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  if (typeof scanId !== 'string') return <Redirect href="/progress" />;
  return <ScanDetailScreen scanId={scanId} />;
}
