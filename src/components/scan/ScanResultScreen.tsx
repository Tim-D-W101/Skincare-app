import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { Button, Card, Disclaimer, ScoreRing, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ATTRIBUTE_KEYS } from '@/constants/scan';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { useScanStore } from '@/stores/useScanStore';
import { sizes, spacing } from '@/theme/tokens';

/**
 * A plain results screen, so a completed scan has somewhere to land. The
 * full results experience replaces it in Phase 7.
 */
export function ScanResultScreen() {
  // The result as it was on arrival, so leaving doesn't change the screen mid-transition.
  const [analysis] = useState(() => useScanStore.getState().analysis);
  const endScanFlow = useScanStore((state) => state.endScanFlow);
  const reduceMotion = useReduceMotion();

  const done = useCallback(() => {
    endScanFlow();
    router.dismissTo('/');
  }, [endScanFlow]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        done();
        return true;
      });
      return () => subscription.remove();
    }, [done]),
  );

  if (analysis.stage !== 'complete') return <Redirect href="/" />;
  const { result } = analysis;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text variant="h1" accessibilityRole="header">
        {copy.results.title}
      </Text>

      <View style={styles.overall}>
        <ScoreRing
          score={result.overall}
          size={sizes.scoreRing.lg}
          strokeWidth={sizes.scoreRingStroke.lg}
          label={copy.results.overall}
          animate={!reduceMotion}
        />
      </View>
      <Text variant="h3" align="center">
        {result.headline}
      </Text>

      <Card style={styles.scores}>
        {ATTRIBUTE_KEYS.map((key) => (
          <View
            key={key}
            style={styles.scoreRow}
            accessible
            accessibilityLabel={`${copy.results.attributes[key]}, ${result.scores[key]}`}
          >
            <Text>{copy.results.attributes[key]}</Text>
            <Text variant="label">{result.scores[key]}</Text>
          </View>
        ))}
      </Card>

      {result.referToProfessional ? (
        <Card>
          <Text variant="bodySmall" color="textSecondary">
            {copy.disclaimers.referral}
          </Text>
        </Card>
      ) : null}

      <Disclaimer variant="full" />

      <Button label={copy.common.done} onPress={done} fullWidth size="lg" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  overall: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  scores: {
    gap: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
