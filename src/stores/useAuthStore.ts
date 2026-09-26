import {
  isAuthApiError,
  isAuthRetryableFetchError,
  type Session,
  type User,
} from '@supabase/supabase-js';
import { create } from 'zustand';

import { copy } from '@/constants/copy';
import { authRedirectUrl } from '@/lib/auth';
import { logInDevelopment, toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/timeout';
import type { Profile, ProfileUpdate } from '@/types/profile';

/**
 * Anonymous-first authentication.
 *
 * On first launch the app signs in anonymously: a real user id and profile row
 * exist before the first screen renders, with no sign-in screen. An email is
 * only asked for when it matters ("save my progress", or subscribing), and
 * linking it keeps the same user id, so every scan carries over.
 */

export interface ActionFailure {
  ok: false;
  /** Safe to show as-is: always a string from copy.ts. */
  message: string;
}

export type ActionResult = { ok: true } | ActionFailure;

export type UpgradeResult =
  | {
      ok: true;
      /** False when the project links emails without confirmation, so no email was sent. */
      confirmationSent: boolean;
    }
  | (ActionFailure & { emailInUse: boolean });

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True while a session is being established: at launch, and after signing out. */
  isLoading: boolean;
  isAnonymous: boolean;
  /** Set when launch could not establish a session. The root layout offers a retry. */
  startupError: string | null;

  /** Restores the stored session, or signs in anonymously when there is none. */
  initialise: () => Promise<void>;
  signInAnonymously: () => Promise<ActionResult>;
  /** Emails a sign-in link to an existing (or new) account. */
  signInWithEmail: (email: string) => Promise<ActionResult>;
  /** Links an email to the current anonymous user. The user id stays the same. */
  upgradeAnonymousAccount: (email: string) => Promise<UpgradeResult>;
  /** Finishes either email flow once its link opens the app. */
  completeEmailLink: (code: string | undefined) => Promise<ActionResult>;
  signOut: () => Promise<ActionResult>;
  refreshProfile: () => Promise<ActionResult>;
  updateProfile: (changes: ProfileUpdate) => Promise<ActionResult>;
  /** Deletes every photo, row and the auth user, then starts over as a new anonymous user. */
  deleteAccount: () => Promise<ActionResult>;
}

/** No launch-time network call may hold up the first screen for longer than this. */
const STARTUP_TIMEOUT_MS = 3000;

const SCANS_BUCKET = 'scans';
const STORAGE_PAGE_SIZE = 100;

const signedOutState = {
  session: null,
  user: null,
  profile: null,
  isAnonymous: false,
} as const;

function sessionState(session: Session) {
  return {
    session,
    user: session.user,
    isAnonymous: session.user.is_anonymous === true,
  };
}

function failure(error: unknown): ActionFailure {
  return { ok: false, message: toUserMessage(error) };
}

// Single-flight guards. A retry must never start a second anonymous sign-in
// while the first is still in flight (that would create an orphaned user), and
// a link's one-time code can only be exchanged once.
let pendingInitialise: Promise<void> | null = null;
let pendingAnonymousSignIn: ReturnType<typeof supabase.auth.signInAnonymously> | null = null;
const emailLinkExchanges = new Map<string, Promise<ActionResult>>();

/** Set while the app itself signs out, so the listener knows the SIGNED_OUT event is expected. */
let signingOut = false;
let listening = false;

/** Null when no row exists, which means the user behind the session has been deleted. */
async function fetchProfile(userId: string, timeoutMs?: number): Promise<Profile | null> {
  const request = supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  const { data, error } = await (timeoutMs === undefined
    ? request
    : withTimeout(request, timeoutMs));
  if (error) throw error;
  return data;
}

async function requireProfile(userId: string, timeoutMs?: number): Promise<Profile> {
  const profile = await fetchProfile(userId, timeoutMs);
  if (!profile) throw new Error('No profile row for the signed-in user');
  return profile;
}

/**
 * Forgets the session on this device only. For a user that no longer exists
 * the server refuses the call, and the client clears the session regardless.
 */
async function clearLocalSession(timeoutMs?: number): Promise<void> {
  signingOut = true;
  try {
    const request = supabase.auth.signOut({ scope: 'local' });
    const { error } = await (timeoutMs === undefined ? request : withTimeout(request, timeoutMs));
    if (error) throw error;
  } finally {
    signingOut = false;
  }
}

async function startAnonymousSession(timeoutMs?: number): Promise<Session> {
  pendingAnonymousSignIn ??= supabase.auth.signInAnonymously().finally(() => {
    pendingAnonymousSignIn = null;
  });
  const request = pendingAnonymousSignIn;
  const { data, error } = await (timeoutMs === undefined
    ? request
    : withTimeout(request, timeoutMs));
  if (error) throw error;
  if (!data.session) throw new Error('Anonymous sign-in returned no session');
  return data.session;
}

/** Removes every file under the user's folder in the scans bucket. */
async function removeStoredPhotos(userId: string): Promise<void> {
  const bucket = supabase.storage.from(SCANS_BUCKET);
  for (;;) {
    // Always list from the start: each pass deletes what the previous one found.
    const { data: files, error } = await bucket.list(userId, { limit: STORAGE_PAGE_SIZE });
    if (error) throw error;
    if (files.length === 0) return;

    const { data: removed, error: removeError } = await bucket.remove(
      files.map((file) => `${userId}/${file.name}`),
    );
    if (removeError) throw removeError;
    // Storage reports a refused delete as an empty result, not an error. Stop
    // rather than loop forever over files that can't be removed.
    if (removed.length === 0) throw new Error('Stored photos could not be removed');
    if (files.length < STORAGE_PAGE_SIZE) return;
  }
}

export const useAuthStore = create<AuthState>()((set, get) => {
  function listenForAuthChanges(): void {
    if (listening) return;
    listening = true;

    // Only state updates happen in here. Calling back into supabase.auth from
    // inside this callback can deadlock, so follow-up work is deferred.
    supabase.auth.onAuthStateChange((event, session) => {
      const current = get();

      if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
        if (session.user.id === current.user?.id) set(sessionState(session));
        return;
      }

      // The session ended without the app asking, for example a revoked
      // refresh token. Start over rather than show screens with no user.
      if (event === 'SIGNED_OUT' && !signingOut && current.session && !current.isLoading) {
        setTimeout(() => void get().initialise(), 0);
      }
    });
  }

  return {
    ...signedOutState,
    isLoading: true,
    startupError: null,

    initialise: () => {
      pendingInitialise ??= (async () => {
        set({ isLoading: true, startupError: null });
        listenForAuthChanges();
        try {
          const { data, error } = await withTimeout(supabase.auth.getSession(), STARTUP_TIMEOUT_MS);
          // A stored session that couldn't be read (usually offline during a
          // token refresh) must not be replaced by a new anonymous user: that
          // would strand everything the stored user owns. Retry instead.
          if (error) throw error;

          let session = data.session;
          let profile = session ? await fetchProfile(session.user.id, STARTUP_TIMEOUT_MS) : null;
          if (session && !profile) {
            // The stored user has been deleted (account deletion, or removed in
            // the dashboard). Its data is gone, so start over.
            await clearLocalSession(STARTUP_TIMEOUT_MS);
            session = null;
          }
          if (!session) {
            session = await startAnonymousSession(STARTUP_TIMEOUT_MS);
            profile = await requireProfile(session.user.id, STARTUP_TIMEOUT_MS);
          }
          if (!profile) throw new Error('No profile row for the signed-in user');

          set({ ...sessionState(session), profile, isLoading: false, startupError: null });
        } catch (error: unknown) {
          logInDevelopment('Could not establish a session at launch', error);
          set({ isLoading: false, startupError: copy.auth.startFailed });
        }
      })().finally(() => {
        pendingInitialise = null;
      });
      return pendingInitialise;
    },

    signInAnonymously: async () => {
      try {
        const session = await startAnonymousSession();
        const profile = await requireProfile(session.user.id);
        set({ ...sessionState(session), profile });
        return { ok: true };
      } catch (error: unknown) {
        return failure(error);
      }
    },

    signInWithEmail: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: authRedirectUrl('signIn') },
      });
      return error ? failure(error) : { ok: true };
    },

    upgradeAnonymousAccount: async (email) => {
      if (!get().isAnonymous) {
        return { ok: false, message: copy.errors.generic, emailInUse: false };
      }
      const { data, error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: authRedirectUrl('save') },
      );
      if (error) {
        if (isAuthApiError(error) && error.code === 'email_exists') {
          return { ok: false, message: copy.auth.saveProgress.emailInUse, emailInUse: true };
        }
        return { ...failure(error), emailInUse: false };
      }
      // With email confirmation on (the default) the address waits in
      // `new_email` until the link is opened. With it off, it's linked already.
      return { ok: true, confirmationSent: Boolean(data.user.new_email) };
    },

    completeEmailLink: (code) => {
      // An expired or reused link arrives with error parameters and no code.
      if (!code) return Promise.resolve({ ok: false, message: copy.auth.callback.failed });

      let exchange = emailLinkExchanges.get(code);
      if (!exchange) {
        exchange = (async (): Promise<ActionResult> => {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            logInDevelopment('Email link exchange failed', error);
            return isAuthRetryableFetchError(error)
              ? failure(error)
              : { ok: false, message: copy.auth.callback.failed };
          }
          try {
            const profile = await requireProfile(data.session.user.id);
            set({ ...sessionState(data.session), profile });
            return { ok: true };
          } catch (profileError: unknown) {
            return failure(profileError);
          }
        })();
        emailLinkExchanges.set(code, exchange);
      }
      return exchange;
    },

    signOut: async () => {
      try {
        await clearLocalSession();
      } catch (error: unknown) {
        return failure(error);
      }

      // Back to a first-launch state: a fresh anonymous user, then onboarding.
      set({ ...signedOutState, isLoading: true });
      await get().initialise();
      return { ok: true };
    },

    refreshProfile: async () => {
      const { user } = get();
      if (!user) return { ok: false, message: copy.errors.sessionExpired };
      try {
        set({ profile: await requireProfile(user.id) });
        return { ok: true };
      } catch (error: unknown) {
        return failure(error);
      }
    },

    updateProfile: async (changes) => {
      const { user } = get();
      if (!user) return { ok: false, message: copy.errors.sessionExpired };
      const { data, error } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', user.id)
        .select()
        .single();
      if (error) return failure(error);
      set({ profile: data });
      return { ok: true };
    },

    deleteAccount: async () => {
      const { user } = get();
      if (!user) return { ok: false, message: copy.errors.sessionExpired };
      try {
        // Photos first: the database function can't remove storage files, and
        // once the user is gone their folder is no longer reachable from the app.
        await removeStoredPhotos(user.id);
        const { error } = await supabase.rpc('delete_my_account');
        if (error) throw error;
      } catch (error: unknown) {
        return failure(error);
      }

      try {
        await clearLocalSession();
      } catch (signOutError: unknown) {
        // Not fatal: initialise notices the deleted user and starts over anyway.
        logInDevelopment('Sign-out after account deletion', signOutError);
      }

      set({ ...signedOutState, isLoading: true });
      await get().initialise();
      return { ok: true };
    },
  };
});
