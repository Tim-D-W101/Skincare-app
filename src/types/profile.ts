import type { Tables, TablesUpdate } from './database';

export type Profile = Tables<'profiles'>;

/**
 * The profile columns the app may write. The database grants update on exactly
 * these; `free_scan_used` and the timestamps are server-only.
 */
export type ProfileUpdate = Pick<
  TablesUpdate<'profiles'>,
  | 'display_name'
  | 'age_band'
  | 'skin_type'
  | 'concerns'
  | 'primary_goal'
  | 'timezone'
  | 'onboarding_completed_at'
  | 'reminder_enabled'
  | 'reminder_weekday'
  | 'reminder_hour'
>;
