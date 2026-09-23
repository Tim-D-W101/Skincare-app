-- =============================================================================
-- 0002_storage.sql
--
-- The private storage bucket for face photographs.
-- Idempotent: safe to run more than once in the Supabase SQL editor.
--
-- PATH CONVENTION
--   scans/{user_id}/{scan_id}.jpg
--   The first folder is always the owner's user id. Every policy below keys
--   off that folder, and the scans table only accepts an image_path in this
--   exact shape, so the two stay in step.
--
-- WHY THE BUCKET MUST STAY PRIVATE
--   These are photographs of people's faces. A public bucket serves every
--   file to anyone who has or guesses its URL, with no sign-in. A private
--   bucket serves nothing without either a signed-in user who passes the
--   policies below, or a short-lived signed URL. Never flip this to public,
--   and never hand out a signed URL that lives longer than it needs to.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scans', 'scans', false, 6291456, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---- signed-in users: their own folder only ---------------------------------

-- Upload: you can add a file only directly inside your own folder,
-- i.e. {your_user_id}/{file}. Nested folders are refused.
drop policy if exists "scans bucket: upload own" on storage.objects;
create policy "scans bucket: upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
  );

-- Read: you can read (and create signed URLs for) files in your own folder.
drop policy if exists "scans bucket: read own" on storage.objects;
create policy "scans bucket: read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Delete: you can delete files in your own folder (photo deletion and
-- account deletion both rely on this).
drop policy if exists "scans bucket: delete own" on storage.objects;
create policy "scans bucket: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- No update policy: photos are never overwritten in place. A retake is a new
-- scan with a new id.


-- ---- the analyze-scan Edge Function -----------------------------------------

-- The service role already bypasses RLS; this policy states that intent
-- explicitly so it survives any future change to that default. It lets the
-- Edge Function read images for analysis and clean up after failures.
drop policy if exists "scans bucket: service role full access" on storage.objects;
create policy "scans bucket: service role full access" on storage.objects
  for all to service_role
  using (bucket_id = 'scans')
  with check (bucket_id = 'scans');
