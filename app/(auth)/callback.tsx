import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { copy } from '@/constants/copy';
import { parseEmailFlow } from '@/lib/auth';
import { isOnboarded } from '@/lib/onboarding';
import { useAuthStore } from '@/stores/useAuthStore';

type Outcome = { status: 'working' } | { status: 'done' } | { status: 'failed'; message: string };

/**
 * Where email links land (see authRedirectUrl). The link carries a one-time
 * `code`; an expired or already-used link carries error parameters instead.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; mode?: string }>();
  const flow = parseEmailFlow(params.mode);
  const code = params.code;
  const completeEmailLink = useAuthStore((state) => state.completeEmailLink);
  const onboarded = useAuthStore((state) => isOnboarded(state.profile));
  const [outcome, setOutcome] = useState<Outcome>({ status: 'working' });

  useEffect(() => {
    let active = true;
    void completeEmailLink(code).then((result) => {
      if (!active) return;
      setOutcome(result.ok ? { status: 'done' } : { status: 'failed', message: result.message });
    });
    return () => {
      active = false;
    };
  }, [code, completeEmailLink]);

  // Navigate from an effect, after the new account's profile has rendered, so
  // the root layout's guards already allow the destination.
  useEffect(() => {
    if (outcome.status !== 'done') return;
    // Back to where the flow started if it's still in the history, otherwise
    // straight to the right place for this account.
    if (!onboarded) router.dismissTo('/onboarding');
    else router.dismissTo(flow === 'save' ? '/settings' : '/');
  }, [outcome.status, onboarded, flow]);

  return (
    <Screen contentStyle={styles.content}>
      {outcome.status === 'failed' ? (
        <ErrorState
          message={outcome.message}
          onRetry={() => router.replace({ pathname: '/sign-in', params: { mode: flow } })}
          retryLabel={copy.auth.callback.requestNew}
        />
      ) : (
        <LoadingState variant="spinner" accessibilityLabel={copy.auth.callback.working} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
});
