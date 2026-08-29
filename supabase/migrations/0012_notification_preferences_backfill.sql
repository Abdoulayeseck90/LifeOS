-- LifeOS Migration 0012: Notification preferences backfill / repair
--
-- Fixes: "TypeError: Cannot read properties of undefined (reading
-- 'appointments')" in notification-preferences-form.tsx. Root cause was
-- never proven to be one single thing (I have no way to query the live
-- database from here), but the fix has to be correct under every
-- possible cause: 0011_notification_scheduling.sql was never run at all
-- (column doesn't exist -> null), it ran but a row predates it in some
-- unexpected way, or a prior client write overwrote the jsonb column
-- with a partial object (a plain column UPDATE replaces jsonb wholesale,
-- it doesn't merge). This migration is idempotent and safe to run
-- whether or not 0011 ever executed.

-- If 0011 never ran on this database, these columns won't exist yet —
-- add them the same way 0011 does (IF NOT EXISTS makes this a no-op
-- otherwise).
alter table profiles add column if not exists timezone text not null default 'UTC';
alter table profiles add column if not exists notification_preferences jsonb not null default '{
  "appointments": {"in_app": true, "email": true},
  "monitoring": {"in_app": true, "email": true},
  "general_activity": {"in_app": true, "email": false},
  "email_timing": {"seven_day": true, "three_day": true, "one_day": true, "day_of": false},
  "overdue_email_enabled": true,
  "overdue_email_recurring": false
}'::jsonb;

-- Repair any row that's missing a top-level category/section or a
-- leaf key within one — the exact bug this migration exists for.
-- `default || existing` means: start from the complete default shape,
-- then overlay whatever the row actually has, so a user's real,
-- previously-saved choices are preserved and only genuine gaps get
-- filled — nobody's existing preferences are reset by this (Requirement
-- 10: existing users must not lose their notification preferences).
update profiles
set notification_preferences = jsonb_build_object(
  'appointments',
    '{"in_app": true, "email": true}'::jsonb || coalesce(notification_preferences->'appointments', '{}'::jsonb),
  'monitoring',
    '{"in_app": true, "email": true}'::jsonb || coalesce(notification_preferences->'monitoring', '{}'::jsonb),
  'general_activity',
    '{"in_app": true, "email": false}'::jsonb || coalesce(notification_preferences->'general_activity', '{}'::jsonb),
  'email_timing',
    '{"seven_day": true, "three_day": true, "one_day": true, "day_of": false}'::jsonb
      || coalesce(notification_preferences->'email_timing', '{}'::jsonb),
  'overdue_email_enabled',
    coalesce(notification_preferences->'overdue_email_enabled', 'true'::jsonb),
  'overdue_email_recurring',
    coalesce(notification_preferences->'overdue_email_recurring', 'false'::jsonb)
)
where notification_preferences is null
   or not (notification_preferences ? 'appointments')
   or not (notification_preferences ? 'monitoring')
   or not (notification_preferences ? 'general_activity')
   or not (notification_preferences ? 'email_timing')
   or not (notification_preferences ? 'overdue_email_enabled')
   or not (notification_preferences ? 'overdue_email_recurring')
   or not (notification_preferences->'appointments' ? 'in_app')
   or not (notification_preferences->'appointments' ? 'email')
   or not (notification_preferences->'monitoring' ? 'in_app')
   or not (notification_preferences->'monitoring' ? 'email')
   or not (notification_preferences->'general_activity' ? 'in_app')
   or not (notification_preferences->'general_activity' ? 'email')
   or not (notification_preferences->'email_timing' ? 'seven_day')
   or not (notification_preferences->'email_timing' ? 'three_day')
   or not (notification_preferences->'email_timing' ? 'one_day')
   or not (notification_preferences->'email_timing' ? 'day_of');

update profiles set timezone = 'UTC' where timezone is null or timezone = '';
