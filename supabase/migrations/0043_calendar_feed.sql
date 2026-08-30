-- Apple Calendar one-way integration: a per-user secret token that
-- authorizes an unauthenticated ICS feed request (Apple Calendar's
-- subscription fetcher never carries a Supabase session cookie).
--
-- Only ever one live token per user — regenerating replaces it rather
-- than accumulating a history, since there is exactly one "your
-- calendar link" concept in the Settings UI (Generate / Copy /
-- Regenerate, not a list of tokens).
--
-- SECURITY-REVIEW REVISION: the original version of this migration (in
-- a review pass before ever being applied to production) split token
-- validation and event fetching into two functions:
--   get_calendar_feed_user(token_hash) -> user_id
--   get_calendar_feed_events(user_id) -> rows
-- Both were granted EXECUTE to anon/authenticated. That is a real
-- cross-user data leak: Supabase auto-exposes every anon-executable
-- function over PostgREST RPC, so anyone holding only the public anon
-- key (embedded in every client bundle, not a secret) could call
-- get_calendar_feed_events(p_user_id: <any guessed/known uuid>) directly
-- and read that user's appointments/monitoring items, completely
-- bypassing calendar_feed_tokens and RLS on both source tables — and
-- revoking/regenerating the victim's own token would do nothing to stop
-- it, since that function never consulted calendar_feed_tokens at all.
-- This version collapses both steps into ONE function that only ever
-- accepts the token hash and resolves the owning user internally, so
-- there is no standalone entry point anywhere that turns an arbitrary
-- user_id into that user's calendar data.
create table calendar_feed_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- SHA-256 hex digest of the raw token, never the raw token itself —
  -- same reasoning as any bearer-secret storage: a DB read (backup leak,
  -- compromised service role, admin panel) must not hand over a working
  -- credential.
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table calendar_feed_tokens enable row level security;

-- Owner-only visibility for the Settings UI (does a token already exist?
-- when was it created?) — the raw token itself is never stored here, so
-- there is nothing to leak even to the owner's own later reads beyond
-- "a token exists," which Settings already needs to know.
create policy "calendar_feed_tokens_select_own" on calendar_feed_tokens
  for select using (auth.uid() = user_id);
create policy "calendar_feed_tokens_insert_own" on calendar_feed_tokens
  for insert with check (auth.uid() = user_id);
create policy "calendar_feed_tokens_update_own" on calendar_feed_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Deliberately no delete policy and no public/anon select policy at all.
-- Revoking is an update (revoked_at = now()), matching this app's
-- established soft-delete-preferred pattern elsewhere (e.g. Dua routine
-- removal) — old tokens stay as an audit trail of "a link existed and
-- was revoked," never hard-deleted.

create index calendar_feed_tokens_user_id_idx on calendar_feed_tokens(user_id);
revoke all on calendar_feed_tokens from anon;

-- Defensive: this migration has never been applied to production, but
-- do not assume that — drop the two-function design first, by exact
-- signature, so re-running this file (or applying it after a partial
-- earlier attempt) can never leave the old user_id-accepting function
-- reachable alongside the new one.
drop function if exists get_calendar_feed_user(text);
drop function if exists get_calendar_feed_events(uuid);

-- The ONLY public calendar-data entry point. Accepts nothing but the
-- token hash; resolves the owning user_id internally via the CTE and
-- joins every source table against that single resolved value — there
-- is no parameter, return value, or code path here that ever lets a
-- caller supply or influence which user's rows come back. An invalid or
-- revoked token hash makes `matched_user` empty, which makes both joins
-- empty, which returns zero rows — the same shape as "valid token, user
-- has no events," which is intentional (Section 16: never let the
-- response distinguish those cases). Read-only, no dynamic SQL, no
-- EXECUTE — plain parameterized `language sql`, so there is no
-- injection surface regardless.
create or replace function get_calendar_feed_events(p_token_hash text)
returns table (
  source text,
  id uuid,
  title text,
  description text,
  starts_at timestamptz,
  due_date date,
  location text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with matched_user as (
    select user_id from calendar_feed_tokens
    where token_hash = p_token_hash and revoked_at is null
  )
  select 'appointment'::text, a.id, a.provider_name, a.notes, a.date_time, null::date, a.location, a.created_at, a.updated_at
  from appointments a
  join matched_user u on a.user_id = u.user_id
  where a.status in ('scheduled', 'completed')

  union all

  select 'monitoring'::text, m.id, m.name, m.frequency_note, null::timestamptz, m.next_due_at, null::text, m.created_at, m.updated_at
  from monitoring_items m
  join matched_user u on m.user_id = u.user_id
  where m.status = 'active' and m.next_due_at is not null;
$$;
revoke all on function get_calendar_feed_events(text) from public;
-- anon only — this is the one function the unauthenticated ICS route
-- calls, and the token hash is its sole authorization credential.
-- authenticated is intentionally NOT granted here: the feed route never
-- runs with a real session, and there is no legitimate reason for a
-- logged-in user's own JWT to be a path into this function either.
grant execute on function get_calendar_feed_events(text) to anon;
