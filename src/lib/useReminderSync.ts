import { useEffect } from 'react';
import { AppState } from 'react-native';

import { configureNotifications } from '@/lib/notifications';
import { useReminderStore } from '@/stores/useReminderStore';

/**
 * Keeps scheduled reminders up to date: on launch and whenever the app comes
 * back to the foreground, the plan is rebuilt from the latest scans and
 * settings. Never asks for permission.
 */
export function useReminderSync(): void {
  useEffect(() => {
    configureNotifications();
    const { load, reschedule } = useReminderStore.getState();
    void load().then(reschedule);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // The permission may have been changed in the phone's settings meanwhile.
      void load().then(reschedule);
    });
    return () => subscription.remove();
  }, []);
}
