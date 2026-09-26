import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, Chip, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { ROUTINE_VISITS_BEFORE_OFFER } from '@/constants/reminders';
import { formatHour } from '@/lib/dates';
import { logInDevelopment } from '@/lib/errors';
import type { RoutineReminderSlot } from '@/lib/reminderPlan';
import { useAuthStore } from '@/stores/useAuthStore';
import { useReminderStore, type WeeklyReminderChanges } from '@/stores/useReminderStore';
import { sizes, spacing, useColors } from '@/theme/tokens';

const HOURS_IN_DAY = 24;
const ROUTINE_SLOTS: readonly RoutineReminderSlot[] = ['off', 'morning', 'evening'];

/**
 * Every reminder control: a master switch, each kind on its own, and the day
 * and time of the weekly reminder. Changes reschedule at once. If
 * notifications were refused, it points to the phone's settings instead of
 * asking again.
 */
export function RemindersSection() {
  const permission = useReminderStore((state) => state.permission);
  const settings = useReminderStore((state) => state.settings);
  const update = useReminderStore((state) => state.update);
  const updateWeekly = useReminderStore((state) => state.updateWeekly);
  const askPermission = useReminderStore((state) => state.askPermission);
  const profile = useAuthStore((state) => state.profile);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const saveWeekly = async (changes: WeeklyReminderChanges) => {
    setError(null);
    const result = await updateWeekly(changes);
    if (!result.ok) setError(copy.settings.reminders.saveFailed);
  };

  const enable = async () => {
    setAsking(true);
    await askPermission();
    setAsking(false);
  };

  const openPhoneSettings = () => {
    Linking.openSettings().catch((openError: unknown) => {
      logInDevelopment('Could not open the phone settings', openError);
    });
  };

  const title = (
    <Text variant="h3" accessibilityRole="header">
      {copy.settings.reminders.title}
    </Text>
  );

  if (permission === 'denied') {
    return (
      <Card style={styles.card}>
        {title}
        <Text color="textSecondary">{copy.notifications.permission.deniedBody}</Text>
        <Button
          label={copy.settings.reminders.openSettings}
          onPress={openPhoneSettings}
          variant="secondary"
          fullWidth
        />
      </Card>
    );
  }

  if (permission === 'undetermined') {
    return (
      <Card style={styles.card}>
        {title}
        <Text color="textSecondary">{copy.notifications.permission.body}</Text>
        <Button
          label={copy.settings.reminders.enable}
          onPress={() => void enable()}
          loading={asking}
          fullWidth
        />
      </Card>
    );
  }

  const weeklyOn = profile?.reminder_enabled ?? false;
  const weekday = profile?.reminder_weekday ?? 0;
  const hour = profile?.reminder_hour ?? 0;
  const routineUnlocked = settings.routineVisits >= ROUTINE_VISITS_BEFORE_OFFER;

  return (
    <Card style={styles.card}>
      {title}
      <SwitchRow
        label={copy.settings.reminders.master}
        value={settings.enabled}
        onChange={(enabled) => update({ enabled })}
      />

      {settings.enabled ? (
        <>
          <View style={styles.group}>
            <SwitchRow
              label={copy.settings.reminders.weekly}
              hint={copy.settings.reminders.weeklyHint}
              value={weeklyOn}
              onChange={(enabled) => void saveWeekly({ reminder_enabled: enabled })}
            />
            {weeklyOn ? (
              <>
                <Text variant="label">{copy.settings.reminders.day}</Text>
                <View
                  style={styles.chips}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={copy.settings.reminders.day}
                >
                  {copy.settings.reminders.weekdays.map((day) => (
                    <Chip
                      key={day.value}
                      label={day.short}
                      accessibilityLabel={day.name}
                      selected={day.value === weekday}
                      onPress={() => void saveWeekly({ reminder_weekday: day.value })}
                      role="radio"
                    />
                  ))}
                </View>
                <Text variant="label">{copy.settings.reminders.time}</Text>
                <View style={styles.stepper}>
                  <Button
                    label={copy.settings.reminders.earlier}
                    leadingIcon="minus"
                    variant="secondary"
                    size="sm"
                    onPress={() =>
                      void saveWeekly({ reminder_hour: (hour + HOURS_IN_DAY - 1) % HOURS_IN_DAY })
                    }
                  />
                  <Text variant="h3" accessibilityLiveRegion="polite" style={styles.hour}>
                    {formatHour(hour)}
                  </Text>
                  <Button
                    label={copy.settings.reminders.later}
                    leadingIcon="plus"
                    variant="secondary"
                    size="sm"
                    onPress={() => void saveWeekly({ reminder_hour: (hour + 1) % HOURS_IN_DAY })}
                  />
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.group}>
            <Text variant="label">{copy.settings.reminders.routine}</Text>
            {routineUnlocked ? (
              <>
                <View
                  style={styles.chips}
                  accessibilityRole="radiogroup"
                  accessibilityLabel={copy.settings.reminders.routine}
                >
                  {ROUTINE_SLOTS.map((slot) => (
                    <Chip
                      key={slot}
                      label={copy.settings.reminders.routineOptions[slot]}
                      selected={settings.routine === slot}
                      onPress={() => update({ routine: slot })}
                      role="radio"
                    />
                  ))}
                </View>
                <Text variant="caption" color="textSecondary">
                  {copy.settings.reminders.routineHint}
                </Text>
              </>
            ) : (
              <Text variant="bodySmall" color="textSecondary">
                {copy.settings.reminders.routineLocked}
              </Text>
            )}
          </View>

          <SwitchRow
            label={copy.settings.reminders.streak}
            hint={copy.settings.reminders.streakHint}
            value={settings.streak}
            onChange={(streak) => update({ streak })}
          />
        </>
      ) : null}

      <Text variant="caption" color="textSecondary">
        {copy.settings.reminders.oneADay}
      </Text>
      {error ? (
        <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </Card>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const palette = useColors();
  return (
    <View style={styles.switchBlock}>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={label}
          accessibilityHint={hint}
          trackColor={{ false: palette.border, true: palette.accent }}
          thumbColor={palette.surfaceElevated}
        />
      </View>
      {hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hour: {
    flex: 1,
    textAlign: 'center',
  },
  switchBlock: {
    gap: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: sizes.minTouchTarget,
  },
  switchLabel: {
    flex: 1,
  },
});
