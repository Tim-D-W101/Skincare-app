import { StyleSheet, View } from 'react-native';

import { copy } from '@/constants/copy';
import { sizes, spacing } from '@/theme/tokens';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ErrorStateProps {
  message: string;
  /** When provided, shows a retry button. */
  onRetry?: () => void;
  retryLabel?: string;
}

/** A calm, recoverable error. Deliberately not red: most errors here are a retry away. */
export function ErrorState({ message, onRetry, retryLabel = copy.common.retry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Icon name="alert" size={sizes.icon.xl} color="textSecondary" />
      <Text variant="body" align="center">
        {message}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" leadingIcon="refresh" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  action: {
    marginTop: spacing.sm,
  },
});
