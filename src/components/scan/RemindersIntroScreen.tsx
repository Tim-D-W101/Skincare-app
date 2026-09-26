import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { useReminderStore } from '@/stores/useReminderStore';
import { sizes, spacing } from '@/theme/tokens';

export interface RemindersIntroScreenProps {
  /** Where to go next, whichever the answer. */
  next: Href;
}

/**
 * Says what reminders are and how often they come, before the system
 * permission prompt. Shown once, after the first successful scan, never on
 * launch. "Not now" is final for this screen; Settings can turn them on later.
 */
export function RemindersIntroScreen({ next }: RemindersIntroScreenProps) {
  const askPermission = useReminderStore((state) => state.askPermission);
  const dismissIntro = useReminderStore((state) => state.dismissIntro);
  const [asking, setAsking] = useState(false);

  const notNow = useCallback(() => {
    dismissIntro();
    router.dismissTo(next);
  }, [dismissIntro, next]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        notNow();
        return true;
      });
      return () => subscription.remove();
    }, [notNow]),
  );

  const allow = async () => {
    setAsking(true);
    // Whatever the answer, the next screen follows; a refusal is respected from here on.
    await askPermission();
    router.dismissTo(next);
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.body}>
        <Icon name="sparkle" size={sizes.icon.xl} color="accent" />
        <Text variant="h2" align="center" accessibilityRole="header">
          {copy.notifications.permission.title}
        </Text>
        <Text color="textSecondary" align="center">
          {copy.notifications.permission.body}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={copy.notifications.permission.allow}
          onPress={() => void allow()}
          loading={asking}
          fullWidth
          size="lg"
        />
        <Button
          label={copy.notifications.permission.notNow}
          onPress={notNow}
          variant="ghost"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
