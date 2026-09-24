import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, Screen } from '@/components/ui';
import { copy } from '@/constants/copy';
import { spacing } from '@/theme/tokens';

/**
 * Home. A placeholder until the scan flow exists: it is where a finished
 * onboarding lands. In development it also links to the component gallery.
 */
export default function Home() {
  return (
    <Screen edges={['top', 'right', 'left']} contentStyle={styles.content}>
      <View style={styles.main}>
        <EmptyState title={copy.progress.noScans.title} body={copy.progress.noScans.body} />
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
