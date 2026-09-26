import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { copy } from '@/constants/copy';
import { REMINDER_CHANNEL_ID } from '@/constants/reminders';
import type { PlannedReminder } from '@/lib/reminderPlan';

/**
 * Local notifications only: everything is scheduled on the phone. There is
 * no push server and no push token.
 */

export type PermissionState = 'granted' | 'denied' | 'undetermined';

let configured = false;

/** Reminders that arrive while the app is open still show. Call once, early. */
export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * The Android channel every reminder uses. Default importance, and it never
 * bypasses Do Not Disturb.
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: copy.notifications.channelName,
    importance: Notifications.AndroidImportance.DEFAULT,
    bypassDnd: false,
  });
}

function toState(status: Notifications.NotificationPermissionsStatus): PermissionState {
  if (status.granted) return 'granted';
  // Once refused, the system prompt is never shown again: Settings is the way back.
  return status.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function readPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/** Shows the system prompt. Only ever called after the in-app explanation. */
export async function requestPermission(): Promise<PermissionState> {
  await ensureChannel();
  return toState(await Notifications.requestPermissionsAsync());
}

/** Replaces every scheduled reminder with the plan. */
export async function scheduleReminders(plan: PlannedReminder[]): Promise<void> {
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body, data: { kind: reminder.kind } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.date,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
