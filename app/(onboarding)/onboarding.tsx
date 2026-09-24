import { Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';

/** Placeholder until the onboarding flow is built. */
export default function Onboarding() {
  return (
    <Screen>
      <Text variant="h1" accessibilityRole="header">
        {copy.onboarding.welcome.title}
      </Text>
    </Screen>
  );
}
