-- LifeOS Migration 0011: Notification Timing & Email Rules
-- Replaces the single hardcoded 7-day-only monitoring reminder with a
-- configurable per-category x per-channel x per-lead-time model (Master
-- Redesign addendum "Notification Timing & Email Rules"). jsonb is
-- already an established pattern in this schema (diagnostic_tests.
-- measurements, audit_events.metadata) — reused here for the same
-- reason: a matrix of related boolean toggles, not a wall of columns.

-- profiles: timezone (needed for correct local-day lead-time math across
-- DST — see src/lib/notifications/scheduling.ts) + the full preference
-- matrix, replacing the single email_reminders_enabled boolean.
alter table profiles add column timezone text not null default 'UTC';
alter table profiles add column notification_preferences jsonb not null default '{
  "appointments": {"in_app": true, "email": true},
  "monitoring": {"in_app": true, "email": true},
  "general_activity": {"in_app": true, "email": false},
  "email_timing": {"seven_day": true, "three_day": true, "one_day": true, "day_of": false},
  "overdue_email_enabled": true,
  "overdue_email_recurring": false
}'::jsonb;

-- Backfill: a user who had explicitly turned the old global email switch
-- off should not suddenly start getting appointment/monitoring/overdue
-- emails under the new granular defaults.
update profiles
set notification_preferences = jsonb_set(
  jsonb_set(
    jsonb_set(notification_preferences, '{appointments,email}', 'false'),
    '{monitoring,email}', 'false'
  ),
  '{overdue_email_enabled}', 'false'
)
where email_reminders_enabled = false;

alter table profiles drop column email_reminders_enabled;

-- reminders: extend status to distinguish delivery outcomes, add the
-- lead-time bucket + idempotency key, and a failure reason for
-- diagnostics (never email content — see services/core/email.ts).
-- 'delivered' is schema-ready for a future Resend delivery-webhook
-- integration; this pass only ever writes 'sent' (Resend accepted it)
-- or 'failed' (Resend rejected it) — the only signal available without
-- a webhook.
alter table reminders drop constraint reminders_status_check;
alter table reminders add constraint reminders_status_check
  check (status in ('pending', 'sent', 'delivered', 'failed', 'cancelled'));

alter table reminders add column lead_time_bucket text not null default 'custom'
  check (lead_time_bucket in ('seven_day', 'three_day', 'one_day', 'day_of', 'overdue', 'custom'));
alter table reminders add column reminder_key text;
alter table reminders add column failure_reason text;

-- Idempotency: the same (user, entity, bucket, channel) can only ever
-- have one live reminder row. Partial index so pre-existing rows (null
-- reminder_key) aren't constrained — only reminders scheduled through
-- the new scheduleRemindersForEvent()/upsert path are.
create unique index reminders_user_reminder_key_idx on reminders(user_id, reminder_key)
  where reminder_key is not null;
