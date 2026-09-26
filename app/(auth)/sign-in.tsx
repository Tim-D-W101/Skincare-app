import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { copy } from '@/constants/copy';
import { isValidEmail, parseEmailFlow } from '@/lib/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { spacing } from '@/theme/tokens';

/**
 * Email entry for both email flows:
 * - default: sign in to an existing account with a magic link
 * - `?mode=save`: link an email to the current anonymous user ("save my progress")
 */
export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = parseEmailFlow(params.mode);
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const upgradeAnonymousAccount = useAuthStore((state) => state.upgradeAnonymousAccount);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailInUse, setEmailInUse] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const text = mode === 'save' ? copy.auth.saveProgress : copy.auth.signIn;
  const submitLabel = mode === 'save' ? copy.auth.saveProgress.cta : copy.auth.signIn.submit;

  const submit = async () => {
    const address = email.trim();
    if (!isValidEmail(address)) {
      setError(copy.auth.signIn.invalidEmail);
      return;
    }

    setSubmitting(true);
    setError(null);
    setEmailInUse(false);

    if (mode === 'save') {
      const result = await upgradeAnonymousAccount(address);
      setSubmitting(false);
      if (!result.ok) {
        setError(result.message);
        setEmailInUse(result.emailInUse);
      } else if (result.confirmationSent) {
        router.push({ pathname: '/check-email', params: { email: address, mode } });
      } else {
        router.back();
      }
      return;
    }

    const result = await signInWithEmail(address);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push({ pathname: '/check-email', params: { email: address, mode } });
  };

  const switchToSignIn = () => {
    setError(null);
    setEmailInUse(false);
    router.setParams({ mode: 'signIn' });
  };

  return (
    <Screen
      scroll
      keyboardAvoiding
      edges={['right', 'bottom', 'left']}
      contentStyle={styles.content}
    >
      <View style={styles.intro}>
        <Text variant="h1" accessibilityRole="header">
          {text.title}
        </Text>
        <Text color="textSecondary">{text.body}</Text>
      </View>

      <TextField
        label={copy.auth.signIn.emailLabel}
        placeholder={copy.auth.signIn.emailPlaceholder}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError(null);
        }}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
        editable={!submitting}
      />

      <View style={styles.actions}>
        <Button
          label={submitLabel}
          onPress={() => void submit()}
          loading={submitting}
          disabled={email.trim().length === 0}
          fullWidth
          size="lg"
        />
        {emailInUse ? (
          <Button
            label={copy.auth.saveProgress.signInInstead}
            onPress={switchToSignIn}
            variant="secondary"
            fullWidth
          />
        ) : null}
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
