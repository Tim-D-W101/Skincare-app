import { StyleSheet, View } from 'react-native';

import { sizes, spacing } from '@/theme/tokens';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  title: string;
  body: string;
  icon?: IconName;
  action?: EmptyStateAction;
}

export function EmptyState({ title, body, icon = 'sparkle', action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={sizes.icon.xl} color="accent" />
      <Text variant="h3" align="center" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {body}
      </Text>
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} />
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
