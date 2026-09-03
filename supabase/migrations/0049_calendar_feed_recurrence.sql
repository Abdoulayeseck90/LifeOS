-- Extend the Apple Calendar feed RPC to also return recurrence data, so
-- the ICS builder can emit one VEVENT with RRULE/EXDATE for a recurring
-- series instead of expanding every future occurrence into its own
-- VEVENT (Apple Calendar/RFC 5545 already understands RRULE natively).
-- Changing the RETURNS TABLE shape requires a drop, not just
-- create-or-replace. Same security posture as 0043_calendar_feed.sql:
-- token-hash-only input, security definer, anon-only grant -- none of
-- that changes here, only the columns returned for appointment rows.
drop function if exists get_calendar_feed_events(text);

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
  updated_at timestamptz,
  recurrence_rule text,
  recurrence_excluded_occurrences timestamptz[],
  recurrence_parent_id uuid,
  recurrence_original_start timestamptz
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
  select
    'appointment'::text,
    a.id,
    coalesce(a.title, a.provider_name),
    a.description,
    a.date_time,
    null::date,
    a.location,
    a.created_at,
    a.updated_at,
    a.recurrence_rule,
    a.recurrence_excluded_occurrences,
    a.recurrence_parent_id,
    a.recurrence_original_start
  from appointments a
  join matched_user u on a.user_id = u.user_id
  where a.status in ('scheduled', 'completed')

  union all

  select
    'monitoring'::text,
    m.id,
    m.name,
    m.frequency_note,
    null::timestamptz,
    m.next_due_at,
    null::text,
    m.created_at,
    m.updated_at,
    null::text,
    null::timestamptz[],
    null::uuid,
    null::timestamptz
  from monitoring_items m
  join matched_user u on m.user_id = u.user_id
  where m.status = 'active' and m.next_due_at is not null;
$$;
revoke all on function get_calendar_feed_events(text) from public;
grant execute on function get_calendar_feed_events(text) to anon;

notify pgrst, 'reload schema';
