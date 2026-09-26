import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler } from 'react-native';

import { copy } from '@/constants/copy';
import { useReminderStore } from '@/stores/useReminderStore';
import { useScanStore } from '@/stores/useScanStore';

import { ResultView } from './ResultView';

type ExitTarget = '/' | '/routine' | '/progress';

/**
 * The results of the scan that has just finished, revealed in stages. Every
 * way out ends the scan flow. "Build my routine" (first scan) goes to the
 * routine tab and "See my progress" (repeat scans) to the progress tab.
 * The first time someone leaves a successful scan, the reminders explanation
 * comes first: after a scan, never on launch.
 */
export function ScanResultScreen() {
  // The result as it was on arrival, so leaving doesn't change the screen mid-transition.
  const [analysis] = useState(() => useScanStore.getState().analysis);
  const endScanFlow = useScanStore((state) => state.endScanFlow);
  const shouldOfferIntro = useReminderStore((state) => state.shouldOfferIntro);

  const exitTo = useCallback(
    (target: ExitTarget) => {
      endScanFlow();
      if (shouldOfferIntro()) {
        router.replace({ pathname: '/scan/reminders', params: { next: target } });
      } else {
        router.dismissTo(target);
      }
    },
    [endScanFlow, shouldOfferIntro],
  );

  const leave = useCallback(() => exitTo('/'), [exitTo]);

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

  return (
    <ResultView
      result={analysis.result}
      previous={analysis.previous}
      animate
      onClose={leave}
      onShare={() => router.push('/scan/share')}
      primaryAction={
        repeat
          ? { label: copy.results.seeProgress, onPress: () => exitTo('/progress') }
          : { label: copy.results.buildRoutine, onPress: () => exitTo('/routine') }
      }
    />
  );
}
