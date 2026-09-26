import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ROUTINE_VISITS_BEFORE_OFFER } from '@/constants/reminders';
import { useReminderStore } from '@/stores/useReminderStore';
import { spacing } from '@/theme/tokens';

/**
 * Offers a daily routine reminder, once someone has used the routine a
 * couple of times. Off unless chosen here or in Settings. Hidden once
 * answered, or if notifications were refused.
 */
export function RoutineReminderOffer() {
  const loaded = useReminderStore((state) => state.loaded);
  const permission = useReminderStore((state) => state.permission);
  const settings = useReminderStore((state) => state.settings);
  const update = useReminderStore((state) => state.update);
  const askPermission = useReminderStore((state) => state.askPermission);
  const dismissRoutineOffer = useReminderStore((state) => state.dismissRoutineOffer);

  const visible =
    loaded &&
    permission !== 'denied' &&
    settings.enabled &&
    settings.routine === 'off' &&
    !settings.routineOfferDismissed &&
    settings.routineVisits >= ROUTINE_VISITS_BEFORE_OFFER;
  if (!visible) return null;

  const choose = async (slot: 'morning' | 'evening') => {
    // The card itself explains what will be sent, so the system prompt can follow.
    const allowed = permission === 'granted' || (await askPermission()) === 'granted';
    if (allowed) update({ routine: slot });
  };

  const offer = copy.routine.reminderOffer;
  return (
    <Card style={styles.card}>
      <Text variant="h3" accessibilityRole="header">
        {offer.title}
      </Text>
      <Text color="textSecondary">{offer.body}</Text>
      <View style={styles.actions}>
        <Button
          label={offer.morning}
          onPress={() => void choose('morning')}
          variant="secondary"
          size="sm"
        />
        <Button
          label={offer.evening}
          onPress={() => void choose('evening')}
          variant="secondary"
          size="sm"
        />
        <Button label={offer.notNow} onPress={dismissRoutineOffer} variant="ghost" size="sm" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
