-- =============================================================================
-- 0001_initial_schema.sql
--
-- Tables, row-level security and account deletion for GlowTrack.
-- Idempotent: safe to run more than once in the Supabase SQL editor.
--
-- Access model, in plain English:
--   * Every table has row-level security (RLS) on. With RLS on, a row is
--     invisible and untouchable unless a policy explicitly allows it.
--   * Policies only ever grant a signed-in user (including anonymous sign-ins)
--     access to rows they own. There are no policies for the `anon` role, so
--     someone holding only the public API key sees nothing.
--   * Some writes are deliberately NOT allowed from the app, because a
--     modified app could abuse them. The analyze-scan Edge Function performs
--     them with the service role, which bypasses RLS:
--       - writing scan_results (so scores can't be forged)
--       - updating a scan's status, model and prompt_version
--       - setting profiles.free_scan_used (so the free scan can't be reset)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Shared helper: keep updated_at current
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- profiles: one row per user, created automatically on sign-up
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  display_name            text,
  age_band                text check (age_band in ('18_24', '25_34', '35_44', '45_54', '55_plus')),
  skin_type               text check (skin_type in ('oily', 'dry', 'combination', 'normal', 'sensitive', 'unsure')),
  concerns                text[] not null default '{}' check (cardinality(concerns) <= 3),
  primary_goal            text,
  timezone                text not null default 'UTC',
  onboarding_completed_at timestamptz,
  reminder_enabled        boolean not null default true,
  reminder_weekday        int not null default 0 check (reminder_weekday between 0 and 6),
  reminder_hour           int not null default 19 check (reminder_hour between 0 and 23),
  free_scan_used          boolean not null default false
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row whenever a new auth user appears (anonymous or not).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- scans: one row per photo submitted
-- -----------------------------------------------------------------------------

create table if not exists public.scans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  image_path      text not null,           -- path within the private 'scans' storage bucket
  status          text not null default 'pending'
                  check (status in ('pending', 'processing', 'complete', 'failed', 'rejected')),
  failure_reason  text,
  capture_quality jsonb,                   -- client-side brightness/blur estimates
  model           text,                    -- which model produced the result
  prompt_version  text,                    -- which prompt version produced it
  completed_at    timestamptz
);

create index if not exists scans_user_created_idx
  on public.scans (user_id, created_at desc);


-- -----------------------------------------------------------------------------
-- scan_results: the scores for a completed scan (written by the server only)
-- -----------------------------------------------------------------------------

create table if not exists public.scan_results (
  id                    uuid primary key default gen_random_uuid(),
  scan_id               uuid not null unique references public.scans (id) on delete cascade,
  user_id               uuid not null references auth.users (id) on delete cascade,
  created_at            timestamptz not null default now(),
  overall               int not null check (overall between 0 and 100),
  clarity               int not null check (clarity between 0 and 100),
  texture               int not null check (texture between 0 and 100),
  pores                 int not null check (pores between 0 and 100),
  hydration             int not null check (hydration between 0 and 100),
  redness               int not null check (redness between 0 and 100),
  evenness              int not null check (evenness between 0 and 100),
  firmness              int not null check (firmness between 0 and 100),
  headline              text not null,
  observations          jsonb not null default '[]',
  focus_areas           jsonb not null default '[]',
  refer_to_professional boolean not null default false,
  raw                   jsonb                     -- full model response, for debugging
);

create index if not exists scan_results_user_created_idx
  on public.scan_results (user_id, created_at);


-- -----------------------------------------------------------------------------
-- routines: the generated morning/evening steps
-- -----------------------------------------------------------------------------

create table if not exists public.routines (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  source_scan_id uuid references public.scans (id) on delete set null,
  is_active      boolean not null default true,
  steps          jsonb not null default '[]'
);

-- At most one active routine per user.
create unique index if not exists routines_one_active_per_user_idx
  on public.routines (user_id)
  where is_active;


-- -----------------------------------------------------------------------------
-- routine_logs: one row per step ticked off per day
-- -----------------------------------------------------------------------------

create table if not exists public.routine_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  routine_id   uuid not null references public.routines (id) on delete cascade,
  log_date     date not null,
  slot         text not null check (slot in ('morning', 'evening')),
  step_key     text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, log_date, slot, step_key)
);

create index if not exists routine_logs_user_date_idx
  on public.routine_logs (user_id, log_date);


-- =============================================================================
-- Row-level security
-- =============================================================================

alter table public.profiles     enable row level security;
alter table public.scans        enable row level security;
alter table public.scan_results enable row level security;
alter table public.routines     enable row level security;
alter table public.routine_logs enable row level security;

-- Defence in depth: the public (anon) role gets no table privileges at all,
-- so even a mistaken policy could not expose rows to someone who is not signed in.
revoke all on public.profiles, public.scans, public.scan_results, public.routines, public.routine_logs
  from anon;


-- ---- profiles ---------------------------------------------------------------

-- Read: you can see your own profile, and only yours.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

-- Insert: none from the app. The on_auth_user_created trigger creates the row.
revoke insert on public.profiles from authenticated;

-- Update: you can edit your own profile, but only the columns granted below.
-- free_scan_used is not among them, so the app cannot reset the free scan.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke update on public.profiles from authenticated;
grant update (
  display_name, age_band, skin_type, concerns, primary_goal, timezone,
  onboarding_completed_at, reminder_enabled, reminder_weekday, reminder_hour
) on public.profiles to authenticated;

-- Delete: you can delete your own profile.
drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);


-- ---- scans ------------------------------------------------------------------

-- Read: you can see your own scans.
drop policy if exists "scans: read own" on public.scans;
create policy "scans: read own" on public.scans
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Insert: you can create a scan for yourself, only in the 'pending' state,
-- and only pointing at an image inside your own folder: {user_id}/{scan_id}.jpg
drop policy if exists "scans: insert own pending" on public.scans;
create policy "scans: insert own pending" on public.scans
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and model is null
    and prompt_version is null
    and completed_at is null
    and image_path = user_id::text || '/' || id::text || '.jpg'
  );

-- Update: none from the app. Status changes come from the Edge Function only.
revoke update on public.scans from authenticated;

-- Delete: you can delete your own scans (their results go with them).
drop policy if exists "scans: delete own" on public.scans;
create policy "scans: delete own" on public.scans
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ---- scan_results -----------------------------------------------------------

-- Read: you can see your own results.
drop policy if exists "scan_results: read own" on public.scan_results;
create policy "scan_results: read own" on public.scan_results
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Insert and update: none from the app. Only the Edge Function writes scores.
revoke insert, update on public.scan_results from authenticated;

-- Delete: you can delete your own results.
drop policy if exists "scan_results: delete own" on public.scan_results;
create policy "scan_results: delete own" on public.scan_results
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ---- routines ---------------------------------------------------------------

-- Read, insert, update, delete: your own routines only.
drop policy if exists "routines: read own" on public.routines;
create policy "routines: read own" on public.routines
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "routines: insert own" on public.routines;
create policy "routines: insert own" on public.routines
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "routines: update own" on public.routines;
create policy "routines: update own" on public.routines
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "routines: delete own" on public.routines;
create policy "routines: delete own" on public.routines
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- ---- routine_logs -----------------------------------------------------------

-- Read, insert, update, delete: your own log entries only.
drop policy if exists "routine_logs: read own" on public.routine_logs;
create policy "routine_logs: read own" on public.routine_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "routine_logs: insert own" on public.routine_logs;
create policy "routine_logs: insert own" on public.routine_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "routine_logs: update own" on public.routine_logs;
create policy "routine_logs: update own" on public.routine_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "routine_logs: delete own" on public.routine_logs;
create policy "routine_logs: delete own" on public.routine_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- =============================================================================
-- Account deletion (GDPR / POPIA)
--
-- Deletes every database row belonging to the calling user, then the auth user
-- itself. It only ever acts on auth.uid(); there is no parameter to target
-- anyone else.
--
-- Storage files: Supabase blocks deleting storage objects with SQL (it would
-- orphan the files). The app deletes everything under {user_id}/ in the
-- 'scans' bucket through the Storage API FIRST, then calls this function.
-- =============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  delete from public.routine_logs where user_id = uid;
  delete from public.routines     where user_id = uid;
  delete from public.scan_results where user_id = uid;
  delete from public.scans        where user_id = uid;
  delete from public.profiles     where id = uid;
  delete from auth.users          where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
