-- Pre-production security audit hardening. No table/policy behavior
-- changes — RLS audit found every user-data table and both storage
-- buckets already correctly scoped. This migration closes three
-- defense-in-depth gaps found during that audit:
--
-- 1. Storage buckets accepted any mime_type/file_size because the
--    only enforcement was client-side JS (trivially bypassed via
--    devtools). Supabase Storage enforces `allowed_mime_types`/
--    `file_size_limit` server-side regardless of what the uploading
--    client claims, independent of any RLS policy.
-- 2. SECURITY DEFINER functions never pinned `search_path`, the
--    standard Postgres/Supabase-linter "Function Search Path Mutable"
--    finding — without it, an unqualified object name inside the
--    function resolves via the caller's search_path at call time
--    rather than a fixed one.
-- 3. Several tables granted base privileges to `anon` even though the
--    app has no anonymous-user data model (every table's own RLS
--    policy already requires `auth.uid() = user_id`, so `anon`
--    couldn't pass it today) — removed so a future RLS policy
--    regression alone wouldn't be sufficient for a breach.

-- 1. Server-side upload validation (mirrors each bucket's existing
-- client-side ALLOWED_MIME_TYPES/MAX_FILE_SIZE_BYTES lists).
update storage.buckets
set file_size_limit = 20971520, -- 20 MB, matches MAX_FILE_SIZE_BYTES in every upload form
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'medical-documents';

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'personal-documents';

-- 2. Pin search_path on every SECURITY DEFINER function in the schema.
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.write_audit_event(text, text, text, uuid, jsonb) set search_path = public, pg_temp;
alter function public.validate_timeline_related_entity() set search_path = public, pg_temp;
alter function public.validate_document_lab_result_links() set search_path = public, pg_temp;

-- 3. Revoke anon (no anonymous-user data model exists anywhere in this app).
revoke all on public.diagnostic_tests from anon;
revoke all on public.monitoring_plans from anon;
revoke all on public.monitoring_items from anon;
revoke all on public.guidelines from anon;
revoke all on public.reminders from anon;
revoke all on public.notifications from anon;
revoke all on public.vitals from anon;
revoke all on public.workouts from anon;
revoke all on public.push_subscriptions from anon;
