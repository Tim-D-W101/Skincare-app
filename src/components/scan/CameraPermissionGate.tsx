import { useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Button, Icon, LoadingState, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { logInDevelopment } from '@/lib/errors';
import { sizes, spacing } from '@/theme/tokens';

export interface CameraPermissionGateProps {
  children: ReactNode;
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Shows its children only once camera access is granted. Before asking, it
 * explains why in the app's own words; after a permanent refusal, it points to
 * the phone's settings.
 */
export function CameraPermissionGate({ children }: CameraPermissionGateProps) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);

  // Coming back from the phone's settings is the usual way access changes.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      getPermission().catch((refreshError: unknown) => {
        logInDevelopment('Could not re-check camera access', refreshError);
      });
    });
    return () => subscription.remove();
  }, [getPermission]);

  if (!permission) return <LoadingState variant="spinner" />;
  if (permission.granted) return children;

  const text = copy.scan.permission;
  const denied = !permission.canAskAgain;

  const allow = async () => {
    setError(null);
    try {
      await requestPermission();
    } catch (requestError: unknown) {
      logInDevelopment('Camera permission request failed', requestError);
      setError(copy.errors.generic);
    }
  };

  const openSettings = async () => {
    setError(null);
    try {
      await Linking.openSettings();
    } catch (settingsError: unknown) {
      logInDevelopment('Could not open settings', settingsError);
      setError(copy.errors.generic);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.body}>
        <Icon name="sparkle" size={sizes.icon.xl} color="accent" />
        <Text variant="h1" accessibilityRole="header">
          {denied ? text.deniedTitle : text.title}
        </Text>
        <Text color="textSecondary">{denied ? text.deniedBody : text.body}</Text>
        {error ? (
          <Text variant="bodySmall" color="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button
          label={denied ? text.openSettings : text.allow}
          onPress={() => void (denied ? openSettings() : allow())}
          fullWidth
          size="lg"
        />
        <Button label={copy.common.notNow} onPress={leave} variant="ghost" fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
