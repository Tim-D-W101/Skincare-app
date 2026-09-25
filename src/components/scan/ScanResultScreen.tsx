import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler } from 'react-native';

import { copy } from '@/constants/copy';
import { useScanStore } from '@/stores/useScanStore';

import { ResultView } from './ResultView';

/**
 * The results of the scan that has just finished, revealed in stages. Every
 * way out ends the scan flow; "See my progress" goes to the progress tab.
 */
export function ScanResultScreen() {
  // The result as it was on arrival, so leaving doesn't change the screen mid-transition.
  const [analysis] = useState(() => useScanStore.getState().analysis);
  const endScanFlow = useScanStore((state) => state.endScanFlow);

  const leave = useCallback(() => {
    endScanFlow();
    router.dismissTo('/');
  }, [endScanFlow]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        leave();
        return true;
      });
      return () => subscription.remove();
    }, [leave]),
  );

  if (analysis.stage !== 'complete') return <Redirect href="/" />;
  const repeat = analysis.previous !== null;

  const seeProgress = () => {
    endScanFlow();
    router.dismissTo('/progress');
  };

  return (
    <ResultView
      result={analysis.result}
      previous={analysis.previous}
      animate
      onClose={leave}
      onShare={() => router.push('/scan/share')}
      primaryAction={
        repeat
          ? { label: copy.results.seeProgress, onPress: seeProgress }
          : // Goes home until the routine screen exists (Phase 9).
            { label: copy.results.buildRoutine, onPress: leave }
      }
    />
  );
}
