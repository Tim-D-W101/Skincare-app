-- =============================================================================
-- 0004_routines.sql
--
-- Saves the routine that analyze-scan now generates with each scan (Phase 9).
-- Idempotent: safe to run more than once in the Supabase SQL editor.
--
-- complete_scan() gains a p_routine argument. In the SAME transaction as the
-- scores, it retires the user's current routine and saves the new one as the
-- active routine, linked to the scan that produced it. Either the scores and
-- the routine are both saved or neither is.
--
-- Run this BEFORE deploying the analyze-scan version that sends p_routine;
-- until then that version's call to complete_scan would not find the function.
-- The existing tables, indexes and row-level security already cover routines
-- and routine_logs (0001); nothing else changes.
-- =============================================================================


-- The four-argument version from 0003 is replaced, not overloaded, so there is
-- only ever one complete_scan.
drop function if exists public.complete_scan(uuid, jsonb, text, text);

create or replace function public.complete_scan(
  p_scan_id        uuid,
  p_result         jsonb,
  p_model          text,
  p_prompt_version text,
  -- The steps as a JSON array of { key, title, why, slot }. Null or empty
  -- keeps the current routine.
  p_routine        jsonb default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  update public.scans
     set status         = 'complete',
         completed_at   = now(),
         model          = p_model,
         prompt_version = p_prompt_version,
         failure_reason = null
   where id = p_scan_id
     and status = 'processing'
  returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'Scan % is not processing', p_scan_id;
  end if;

  insert into public.scan_results (
    scan_id, user_id,
    overall, clarity, texture, pores, hydration, redness, evenness, firmness,
    headline, observations, focus_areas, refer_to_professional, raw
  ) values (
    p_scan_id, v_user_id,
    (p_result ->> 'overall')::int,
    (p_result ->> 'clarity')::int,
    (p_result ->> 'texture')::int,
    (p_result ->> 'pores')::int,
    (p_result ->> 'hydration')::int,
    (p_result ->> 'redness')::int,
    (p_result ->> 'evenness')::int,
    (p_result ->> 'firmness')::int,
    p_result ->> 'headline',
    coalesce(p_result -> 'observations', '[]'::jsonb),
    coalesce(p_result -> 'focus_areas', '[]'::jsonb),
    coalesce((p_result ->> 'refer_to_professional')::boolean, false),
    p_result -> 'raw'
  );

  -- The newest scan's routine becomes the active one. The unique index
  -- routines_one_active_per_user_idx allows only one active routine, so the
  -- old one is retired first. Its ticks stay in routine_logs.
  if p_routine is not null
     and jsonb_typeof(p_routine) = 'array'
     and jsonb_array_length(p_routine) > 0
  then
    update public.routines
       set is_active = false
     where user_id = v_user_id
       and is_active;

    insert into public.routines (user_id, source_scan_id, is_active, steps)
    values (v_user_id, p_scan_id, true, p_routine);
  end if;

  -- The only place the free scan is used up: a scan that finished with scores.
  update public.profiles
     set free_scan_used = true
   where id = v_user_id
     and not free_scan_used;
end;
$$;

-- Server only. The service role bypasses row-level security; nobody else may
-- call this, or they could write their own scores.
revoke execute on function public.complete_scan(uuid, jsonb, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_scan(uuid, jsonb, text, text, jsonb)
  to service_role;
