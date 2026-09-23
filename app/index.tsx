import { router } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { copy } from '@/constants/copy';

/**
 * Placeholder entry route so the scaffold runs on device.
 * Replaced once the onboarding flow exists. In development it links to the
 * component gallery.
 */
export default function Index() {
  return (
    <Screen>
      {__DEV__ ? (
        <Button
          label={copy.devGallery.open}
          variant="secondary"
          onPress={() => router.push('/dev-gallery')}
        />
      ) : null}
    </Screen>
  );
}
