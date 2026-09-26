import {
  FunctionsFetchError,
  FunctionsHttpError,
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
} from '@supabase/supabase-js';

import { copy } from '@/constants/copy';

/**
 * Converts any error from Supabase, the network or our own code into a safe,
 * user-facing message from copy.ts.
 *
 * It never passes through raw error text: Postgres messages, table names and
 * policy details stay out of the UI. The real error is logged in development
 * only.
 */

export type ScanErrorCode = keyof typeof copy.errors.scan;

const AUTH_RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit']);

const AUTH_EXPIRED_CODES = new Set([
  'session_expired',
  'session_not_found',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'user_not_found',
]);

export function isScanErrorCode(value: unknown): value is ScanErrorCode {
  return typeof value === 'string' && value in copy.errors.scan;
}

/** Message for a machine-readable error code returned by the analyze-scan Edge Function. */
export function scanErrorMessage(code: unknown): string {
  return isScanErrorCode(code) ? copy.errors.scan[code] : copy.errors.scan.INTERNAL;
}

/**
 * Reads the `code` field from an Edge Function error response, if there is
 * one. Async because the code is in the response body.
 */
export async function readFunctionErrorCode(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  const response: unknown = error.context;
  if (!(response instanceof Response)) return null;
  try {
    const body: unknown = await response.clone().json();
    if (typeof body === 'object' && body !== null && 'code' in body) {
      const { code } = body;
      return typeof code === 'string' ? code : null;
    }
    return null;
  } catch (parseError: unknown) {
    logInDevelopment('Could not read Edge Function error body', parseError);
    return null;
  }
}

export function toUserMessage(error: unknown): string {
  logInDevelopment('Mapped to user-facing message', error);

  if (isNetworkError(error)) return copy.errors.offline;
  if (isTimeoutError(error)) return copy.errors.timeout;

  if (isAuthError(error)) {
    if (isAuthSessionMissingError(error)) return copy.errors.sessionExpired;
    if (isAuthRetryableFetchError(error)) return copy.errors.offline;
    if (
      error.status === 429 ||
      (error.code !== undefined && AUTH_RATE_LIMIT_CODES.has(error.code))
    ) {
      return copy.errors.rateLimited;
    }
    if (error.code === 'email_address_invalid') return copy.auth.signIn.invalidEmail;
    if (error.code !== undefined && AUTH_EXPIRED_CODES.has(error.code)) {
      return copy.errors.sessionExpired;
    }
    return copy.errors.generic;
  }

  if (error instanceof FunctionsFetchError) return copy.errors.offline;

  // PostgrestError and StorageError both land here: their messages can name
  // tables, columns or policies, so they are never shown.
  return copy.errors.generic;
}

/**
 * True when a request never got an answer (no connection, timed out), so it's
 * worth trying again later, as opposed to the server turning it down.
 */
export function isConnectionFailure(error: unknown): boolean {
  if (isNetworkError(error) || isTimeoutError(error) || isAuthRetryableFetchError(error)) {
    return true;
  }
  // PostgREST reports a request that never reached the server as an error
  // with an empty code and the fetch failure as its message.
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const { code, message } = error;
    return (
      code === '' && typeof message === 'string' && /fetch|network|abort|timed? ?out/i.test(message)
    );
  }
  return false;
}

function isNetworkError(error: unknown): boolean {
  // React Native's fetch rejects with this TypeError when there is no connection.
  return error instanceof TypeError && /network request failed/i.test(error.message);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

export function logInDevelopment(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[errors] ${context}:`, error);
  }
}
