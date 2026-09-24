import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ErrorState, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { spacing, useColors } from '@/theme/tokens';

export interface StartupScreenProps {
  /** When set, shows the message with a retry button instead of the loading state. */
  error?: string | null;
  onRetry?: () => void;
}

/** Shown while the app establishes a session, so no screen ever renders without a user. */
export function StartupScreen({ error, onRetry }: StartupScreenProps) {
  const palette = useColors();

  return (
    <Screen contentStyle={styles.content}>
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : (
        <View style={styles.loading} accessible accessibilityState={{ busy: true }}>
          <ActivityIndicator size="large" color={palette.accent} />
          <Text variant="bodySmall" color="textSecondary" align="center">
            {copy.auth.starting}
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
  },
});
