import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { EVENING_FROM_HOUR, MIDNIGHT_GRACE_MS } from '@/constants/routine';
import { msUntilLocalMidnight } from '@/lib/dates';
import { tickKey } from '@/lib/routine';
import { useReminderStore } from '@/stores/useReminderStore';
import { useRoutineStore } from '@/stores/useRoutineStore';
import { spacing } from '@/theme/tokens';
import type { RoutineSlot } from '@/types/routine';

import { CompletionRing } from './CompletionRing';
import { RoutineReminderOffer } from './RoutineReminderOffer';
import { RoutineSection } from './RoutineSection';

function currentSlot(): RoutineSlot {
  return new Date().getHours() < EVENING_FROM_HOUR ? 'morning' : 'evening';
}

/**
 * Today's routine: morning and evening steps to tick off, with the section
 * for the time of day open. Ticks show at once and save in the background,
 * offline too. The day starts afresh at local midnight.
 */
export function RoutineScreen() {
  const status = useRoutineStore((state) => state.status);
  const routine = useRoutineStore((state) => state.routine);
  const ticked = useRoutineStore((state) => state.ticked);
  const day = useRoutineStore((state) => state.day);
  const notice = useRoutineStore((state) => state.notice);
  const load = useRoutineStore((state) => state.load);
  const toggle = useRoutineStore((state) => state.toggle);
  const checkDay = useRoutineStore((state) => state.checkDay);
  const recordRoutineVisit = useReminderStore((state) => state.recordRoutineVisit);
  const [expanded, setExpanded] = useState<Record<RoutineSlot, boolean>>(() => {
    const slot = currentSlot();
    return { morning: slot === 'morning', evening: slot === 'evening' };
  });

  useFocusEffect(
    useCallback(() => {
      checkDay();
      void load();
      recordRoutineVisit();
    }, [checkDay, load, recordRoutineVisit]),
  );

  // Rolls over at local midnight while the tab is open.
  useEffect(() => {
    const timer = setTimeout(checkDay, msUntilLocalMidnight() + MIDNIGHT_GRACE_MS);
    return () => clearTimeout(timer);
  }, [day, checkDay]);

  if (!routine) {
    return (
      <Screen edges={['top', 'right', 'left']} contentStyle={styles.centered}>
        {status === 'error' ? (
          <ErrorState message={copy.routine.loadFailed} onRetry={() => void load()} />
        ) : status === 'ready' ? (
          <EmptyState
            title={copy.routine.empty.title}
            body={copy.routine.empty.body}
            action={{
              label: copy.routine.empty.cta,
              onPress: () => router.push('/scan/capture'),
            }}
          />
        ) : (
          <LoadingState lines={4} />
        )}
      </Screen>
    );
  }

  const morning = routine.steps.filter((step) => step.slot === 'morning');
  const evening = routine.steps.filter((step) => step.slot === 'evening');
  const done = routine.steps.filter((step) => ticked[tickKey(step.slot, step.key)]).length;

  const toggleSection = (slot: RoutineSlot) =>
    setExpanded((current) => ({ ...current, [slot]: !current[slot] }));

  return (
    <Screen scroll edges={['top', 'right', 'left']} contentStyle={styles.content}>
      <Text variant="h1" accessibilityRole="header">
        {copy.routine.title}
      </Text>

      <View style={styles.ring}>
        <CompletionRing done={done} total={routine.steps.length} />
      </View>

      {notice ? (
        <Text
          variant="bodySmall"
          color="textSecondary"
          align="center"
          accessibilityLiveRegion="polite"
        >
          {notice === 'offline' ? copy.routine.saveFailed : copy.routine.tickFailed}
        </Text>
      ) : null}

      <RoutineReminderOffer />

      <RoutineSection
        slot="morning"
        steps={morning}
        ticked={ticked}
        expanded={expanded.morning}
        onToggleExpanded={() => toggleSection('morning')}
        onToggleStep={toggle}
      />
      <RoutineSection
        slot="evening"
        steps={evening}
        ticked={ticked}
        expanded={expanded.evening}
        onToggleExpanded={() => toggleSection('evening')}
        onToggleStep={toggle}
      />

      <Text variant="bodySmall" color="textSecondary" align="center">
        {copy.routine.consistency}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
  },
  content: {
    gap: spacing.lg,
  },
  ring: {
    alignItems: 'center',
  },
});
