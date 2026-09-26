import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ResultView } from '@/components/scan/ResultView';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { copy } from '@/constants/copy';
import { logInDevelopment } from '@/lib/errors';
import { fetchPreviousResult, fetchScanResult } from '@/lib/scan';
import { useProgressStore } from '@/stores/useProgressStore';
import type { ScanResult } from '@/types/scan';

type Loaded =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; result: ScanResult; previous: ScanResult | null };

/** Fetches a scan and the one before it. Never throws: a failure comes back as an error state. */
async function loadScan(scanId: string): Promise<Loaded> {
  try {
    const result = await fetchScanResult(scanId);
    const previous = await fetchPreviousResult(result);
    return { status: 'ready', result, previous };
  } catch (error: unknown) {
    logInDevelopment('Could not load the scan', error);
    return { status: 'error' };
  }
}

export interface ScanDetailScreenProps {
  scanId: string;
}

/**
 * A past scan's results, opened from the progress screen. Shown whole, with
 * no reveal. The history usually has it already; if not, it's fetched.
 */
export function ScanDetailScreen({ scanId }: ScanDetailScreenProps) {
  const records = useProgressStore((state) => state.records);
  const index = records.findIndex((record) => record.result.scanId === scanId);
  const [fetched, setFetched] = useState<Loaded>({ status: 'loading' });
  const known = index >= 0;

  // Bumped by retry, which runs the fetch again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (known) return;
    let active = true;
    void loadScan(scanId).then((loaded) => {
      if (active) setFetched(loaded);
    });
    return () => {
      active = false;
    };
  }, [known, scanId, attempt]);

  const loaded: Loaded = known
    ? {
        status: 'ready',
        result: records[index].result,
        previous: index > 0 ? records[index - 1].result : null,
      }
    : fetched;

  const close = () => router.back();
  const retry = () => {
    setFetched({ status: 'loading' });
    setAttempt((count) => count + 1);
  };

  if (loaded.status !== 'ready') {
    return (
      <Screen contentStyle={styles.centered}>
        {loaded.status === 'error' ? (
          <ErrorState message={copy.errors.generic} onRetry={retry} />
        ) : (
          <LoadingState variant="spinner" />
        )}
      </Screen>
    );
  }

  return (
    <ResultView
      result={loaded.result}
      previous={loaded.previous}
      animate={false}
      onClose={close}
      primaryAction={{ label: copy.common.done, onPress: close }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
  },
});
