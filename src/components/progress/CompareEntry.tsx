import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { spacing } from '@/theme/tokens';

export interface CompareEntryProps {
  scanCount: number;
}

/** The way into the before-and-after comparison. Needs two scans, and says so until then. */
export function CompareEntry({ scanCount }: CompareEntryProps) {
  return (
    <Card style={styles.card}>
      <Text variant="h3" accessibilityRole="header">
        {copy.progress.compare.title}
      </Text>
      {scanCount < 2 ? (
        <Text color="textSecondary">{copy.progress.compare.needTwo}</Text>
      ) : (
        <>
          <Text color="textSecondary">{copy.progress.compare.entryBody}</Text>
          <Button
            label={copy.progress.compare.open}
            onPress={() => router.push('/progress/compare')}
            variant="secondary"
            fullWidth
          />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
});
