import * as SecureStore from 'expo-secure-store';

import { logInDevelopment } from '@/lib/errors';
import type { RoutineReminderSlot } from '@/lib/reminderPlan';

/**
 * Reminder settings that belong to this phone rather than the account: the
 * notifications live here. The weekly reminder's day and hour are on the
 * profile instead. Kept in SecureStore, the one small persistent store the
 * app already has; none of it is secret.
 */
export interface ReminderSettings {
  /** The master switch. */
  enabled: boolean;
  streak: boolean;
  routine: RoutineReminderSlot;
  /** The explanation before the system permission prompt has been shown. */
  introSeen: boolean;
  /** Visits to the routine tab. A routine reminder is only offered after a couple. */
  routineVisits: number;
  routineOfferDismissed: boolean;
  /** When each reminder in the current plan is due (ms), so a day that already had one gets no other. */
  scheduled: number[];
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  streak: true,
  routine: 'off',
  introSeen: false,
  routineVisits: 0,
  routineOfferDismissed: false,
  scheduled: [],
};

const KEY = 'glowtrack.reminders';

function isSlot(value: unknown): value is RoutineReminderSlot {
  return value === 'off' || value === 'morning' || value === 'evening';
}

export async function readReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_REMINDER_SETTINGS;
    const stored: Partial<Record<keyof ReminderSettings, unknown>> = parsed;
    const flag = (value: unknown, fallback: boolean) =>
      typeof value === 'boolean' ? value : fallback;
    return {
      enabled: flag(stored.enabled, DEFAULT_REMINDER_SETTINGS.enabled),
      streak: flag(stored.streak, DEFAULT_REMINDER_SETTINGS.streak),
      routine: isSlot(stored.routine) ? stored.routine : DEFAULT_REMINDER_SETTINGS.routine,
      introSeen: flag(stored.introSeen, false),
      routineVisits: typeof stored.routineVisits === 'number' ? stored.routineVisits : 0,
      routineOfferDismissed: flag(stored.routineOfferDismissed, false),
      scheduled: Array.isArray(stored.scheduled)
        ? stored.scheduled.filter((time): time is number => typeof time === 'number')
        : [],
    };
  } catch (error: unknown) {
    logInDevelopment('Could not read the reminder settings', error);
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function writeReminderSettings(settings: ReminderSettings): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(settings));
  } catch (error: unknown) {
    // The settings still apply for this session; only a restart would forget them.
    logInDevelopment('Could not save the reminder settings', error);
  }
}

export async function clearReminderSettings(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch (error: unknown) {
    logInDevelopment('Could not clear the reminder settings', error);
  }
}
