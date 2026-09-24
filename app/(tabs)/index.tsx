import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, Screen } from '@/components/ui';
import { copy } from '@/constants/copy';
import { spacing } from '@/theme/tokens';

/**
 * Home. A placeholder until scan results and progress exist: for now it offers
 * a scan. In development it also links to the component gallery.
 */
export default function Home() {
  return (
    <Screen edges={['top', 'right', 'left']} contentStyle={styles.content}>
      <View style={styles.main}>
        <EmptyState
          title={copy.progress.noScans.title}
          body={copy.progress.noScans.body}
          action={{
            label: copy.progress.noScans.cta,
            onPress: () => router.push('/scan/capture'),
          }}
        />
      </View>
      {__DEV__ ? (
        <Button
          label={copy.devGallery.open}
          variant="secondary"
          onPress={() => router.push('/dev-gallery')}
          fullWidth
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
  },
});
