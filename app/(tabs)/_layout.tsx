import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui';
import { copy } from '@/constants/copy';
import { useReminderSync } from '@/lib/useReminderSync';
import { sizes, typography, useColors } from '@/theme/tokens';

export default function TabsLayout() {
  const palette = useColors();
  // The tabs only mount once onboarding is done: reminders are managed from here on.
  useReminderSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarLabelStyle: typography.caption,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.borderSubtle },
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: copy.tabs.home,
          tabBarIcon: ({ focused }) => (
            <Icon name="home" size={sizes.icon.lg} color={focused ? 'accent' : 'textSecondary'} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: copy.tabs.progress,
          tabBarIcon: ({ focused }) => (
            <Icon name="chart" size={sizes.icon.lg} color={focused ? 'accent' : 'textSecondary'} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: copy.tabs.routine,
          tabBarIcon: ({ focused }) => (
            <Icon name="list" size={sizes.icon.lg} color={focused ? 'accent' : 'textSecondary'} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: copy.tabs.settings,
          tabBarIcon: ({ focused }) => (
            <Icon
              name="settings"
              size={sizes.icon.lg}
              color={focused ? 'accent' : 'textSecondary'}
            />
          ),
        }}
      />
    </Tabs>
  );
}
