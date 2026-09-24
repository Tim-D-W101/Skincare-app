-- =============================================================================
-- 0003_scan_pipeline.sql
--
-- What the scan pipeline (Phase 6) needs from the database.
-- Idempotent: safe to run more than once in the Supabase SQL editor.
--
--   1. Realtime on public.scans, so the app hears the moment a scan's status
--      changes. Realtime respects row-level security: a signed-in user only
--      ever receives changes to their own scans.
--   2. complete_scan(), used by the analyze-scan Edge Function. It saves the
--      scores, marks the scan complete and uses up the free scan in ONE
--      transaction. Either all three happen or none do, so a scan that fails
--      part-way can never use up someone's free scan.
-- =============================================================================


-- ---- 1. Realtime ------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'scans'
     )
  then
    alter publication supabase_realtime add table public.scans;
  end if;
end;
$$;


-- ---- 2. complete_scan -------------------------------------------------------

-- p_result carries the scores and text:
--   { overall, clarity, texture, pores, hydration, redness, evenness, firmness,
--     headline, observations, focus_areas, refer_to_professional, raw }
-- Only a scan in 'processing' can be completed, so a scan is never completed
-- twice and a late call can't overwrite a scan that already failed.
create or replace function public.complete_scan(
  p_scan_id        uuid,
  p_result         jsonb,
  p_model          text,
  p_prompt_version text
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

  -- The only place the free scan is used up: a scan that finished with scores.
  update public.profiles
     set free_scan_used = true
   where id = v_user_id
     and not free_scan_used;
end;
$$;

-- Server only. The service role bypasses row-level security; nobody else may
-- call this, or they could write their own scores.
revoke execute on function public.complete_scan(uuid, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_scan(uuid, jsonb, text, text)
  to service_role;
