import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Icon, Screen, Text } from '@/components/ui';
import { copy } from '@/constants/copy';
import { parseEmailFlow } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { sizes, spacing } from '@/theme/tokens';

type Notice = { kind: 'sent' } | { kind: 'error'; message: string };

export default function CheckEmail() {
  const params = useLocalSearchParams<{ email?: string; mode?: string }>();
  const mode = parseEmailFlow(params.mode);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const upgradeAnonymousAccount = useAuthStore((state) => state.upgradeAnonymousAccount);

  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const email = params.email;
  if (!email) return <Redirect href="/sign-in" />;

  const resend = async () => {
    setResending(true);
    setNotice(null);
    const result =
      mode === 'save' ? await upgradeAnonymousAccount(email) : await signInWithEmail(email);
    setResending(false);
    setNotice(result.ok ? { kind: 'sent' } : { kind: 'error', message: result.message });
  };

  return (
    <Screen scroll edges={['right', 'bottom', 'left']} contentStyle={styles.content}>
      <Icon name="sparkle" size={sizes.icon.xl} color="accent" />
      <View style={styles.intro}>
        <Text variant="h1" accessibilityRole="header">
          {copy.auth.checkEmail.title}
        </Text>
        <Text color="textSecondary">{copy.auth.checkEmail.body(email)}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={copy.auth.checkEmail.resend}
          onPress={() => void resend()}
          loading={resending}
          variant="secondary"
          fullWidth
        />
        {notice ? (
          <Text
            variant="bodySmall"
            color={notice.kind === 'sent' ? 'textSecondary' : 'danger'}
            align="center"
            accessibilityLiveRegion="polite"
          >
            {notice.kind === 'sent' ? copy.auth.checkEmail.resent : notice.message}
          </Text>
        ) : null}
        <Button
          label={copy.auth.checkEmail.differentEmail}
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  intro: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
