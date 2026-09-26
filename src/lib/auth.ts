import * as Linking from 'expo-linking';

/**
 * The two email flows:
 * - `signIn`: a magic link into an existing (or new) account
 * - `save`: linking an email to the current anonymous user ("save my progress")
 */
export type EmailFlow = 'signIn' | 'save';

export function parseEmailFlow(value: unknown): EmailFlow {
  return value === 'save' ? 'save' : 'signIn';
}

/**
 * Where email links return to: the route at app/(auth)/callback.tsx. The flow
 * rides along so the callback knows where to go next.
 *
 * Supabase only redirects to allow-listed URLs. Add these under Authentication >
 * URL Configuration > Redirect URLs:
 *   glowtrack://**   installed builds
 *   exp://**         Expo Go during development
 */
export function authRedirectUrl(flow: EmailFlow): string {
  return Linking.createURL('callback', { queryParams: { mode: flow } });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A deliberately loose check. The emailed link is the real proof of an address. */
export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
