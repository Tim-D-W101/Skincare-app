import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { Button, Card, Disclaimer, ScoreRing, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ATTRIBUTE_KEYS } from '@/constants/scan';
import { motion, sizes, spacing } from '@/theme/tokens';
import type { ScanResult } from '@/types/scan';

import { ResultAttributes } from './ResultAttributes';
import { ResultChange } from './ResultChange';
import { ResultFocus } from './ResultFocus';
import { Reveal } from './Reveal';
import { revealProgress, useResultReveal } from './useResultReveal';

/** When the last moving part lands, for the parts this result actually has. */
function revealDuration(result: ScanResult, hasPrevious: boolean): number {
  const timing = motion.results;
  const ends = [
    motion.duration.reveal,
    timing.headlineAt + timing.fade,
    timing.attributesAt +
      (ATTRIBUTE_KEYS.length - 1) * timing.attributeStagger +
      timing.attributeFill,
  ];
  if (result.observations.length > 0) {
    ends.push(
      timing.observationsAt +
        (result.observations.length - 1) * timing.observationStagger +
        timing.fade,
    );
  }
  if (result.focusAreas.length > 0) ends.push(timing.focusAt + timing.fade);
  if (hasPrevious) ends.push(timing.changeAt + timing.fade);
  return Math.max(...ends);
}

export interface ResultViewProps {
  result: ScanResult;
  /** The scan before this one, for the change since then. Null on a first scan. */
  previous: ScanResult | null;
  /** Reveal it in stages. False shows everything at once, quietly, as for a past scan. */
  animate: boolean;
  onClose: () => void;
  primaryAction: { label: string; onPress: () => void };
  /** Shows a Share button once the reveal is over. */
  onShare?: () => void;
}

/**
 * A scan's results, revealed in order: the overall score, the headline, the
 * seven attributes, what stands out, where to focus, and the change since
 * last time. Tapping anywhere finishes the reveal at once.
 */
export function ResultView({
  result,
  previous,
  animate,
  onClose,
  primaryAction,
  onShare,
}: ResultViewProps) {
  const [duration] = useState(() => revealDuration(result, previous !== null));
  const { clock, done, skip } = useResultReveal(duration, animate);
  const ringProgress = useDerivedValue(() =>
    revealProgress(clock.value, 0, motion.duration.reveal),
  );
  const timing = motion.results;

  return (
    // Any touch, including the start of a scroll, finishes the reveal. Nobody waits on it.
    <View style={styles.fill} onTouchStart={skip}>
      <Screen scroll contentStyle={styles.content}>
        <View style={styles.topBar}>
          <Button
            label={copy.common.close}
            leadingIcon="close"
            onPress={onClose}
            variant="ghost"
            size="sm"
          />
          {!done ? (
            <Button label={copy.results.tapToSkip} onPress={skip} variant="ghost" size="sm" />
          ) : onShare ? (
            <Button
              label={copy.results.share}
              leadingIcon="share"
              onPress={onShare}
              variant="ghost"
              size="sm"
            />
          ) : null}
        </View>

        <View style={styles.hero}>
          <Text variant="label" color="textSecondary" accessibilityRole="header">
            {copy.results.title}
          </Text>
          <ScoreRing
            score={result.overall}
            size={sizes.scoreRing.lg}
            strokeWidth={sizes.scoreRingStroke.lg}
            label={copy.results.overall}
            progress={ringProgress}
          />
        </View>

        <Reveal clock={clock} at={timing.headlineAt}>
          <Text variant="h3" align="center">
            {result.headline}
          </Text>
        </Reveal>

        <Reveal clock={clock} at={timing.attributesAt}>
          <ResultAttributes scores={result.scores} clock={clock} />
        </Reveal>

        {result.observations.length > 0 ? (
          <View style={styles.section}>
            <Reveal clock={clock} at={timing.observationsAt}>
              <Text variant="h3" accessibilityRole="header">
                {copy.results.observationsTitle}
              </Text>
            </Reveal>
            {result.observations.map((observation, index) => (
              <Reveal
                key={index}
                clock={clock}
                at={timing.observationsAt + index * timing.observationStagger}
              >
                <Card elevation="none">
                  <Text>{observation}</Text>
                </Card>
              </Reveal>
            ))}
          </View>
        ) : null}

        {result.focusAreas.length > 0 ? (
          <Reveal clock={clock} at={timing.focusAt}>
            <ResultFocus focusAreas={result.focusAreas} scores={result.scores} />
          </Reveal>
        ) : null}

        {previous ? (
          <Reveal clock={clock} at={timing.changeAt}>
            <ResultChange result={result} previous={previous} />
          </Reveal>
        ) : null}

        {/* Never animated, so they are always there. */}
        <Disclaimer variant="full" />

        {result.referToProfessional ? (
          <Card elevation="none">
            <Text variant="bodySmall" color="textSecondary">
              {copy.disclaimers.referral}
            </Text>
          </Card>
        ) : null}

        <Button label={primaryAction.label} onPress={primaryAction.onPress} fullWidth size="lg" />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
});
