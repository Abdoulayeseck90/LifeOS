-- LifeOS Migration 0013: Reminders schema repair (idempotent)
--
-- Fixes: PGRST204 "Could not find the 'failure_reason' column of
-- 'reminders' in the schema cache".
--
-- failure_reason IS the intended field — it's read/written in exactly
-- two places in the app (services/core/reminders.ts, types/core/
-- entities.ts Reminder.failure_reason), both using this same name, and
-- it was already defined correctly in 0011_notification_scheduling.sql
-- alongside lead_time_bucket/reminder_key and the widened status enum.
-- There's no way to confirm from here whether 0011 was ever actually
-- run against the live database — this is the same class of issue as
-- the earlier notification-preferences PGRST204 (0012_notification_
-- preferences_backfill.sql), which repaired `profiles` but not
-- `reminders`. This migration closes that gap: idempotent (IF NOT
-- EXISTS everywhere), safe to run whether or not 0011 or 0012 executed,
-- and does not touch or delete a single existing row's data — every
-- statement either adds a column with a default (existing rows get
-- backfilled by Postgres automatically) or recreates a constraint/index
-- that's structurally identical either way.

alter table reminders add column if not exists lead_time_bucket text not null default 'custom'
  check (lead_time_bucket in ('seven_day', 'three_day', 'one_day', 'day_of', 'overdue', 'custom'));
alter table reminders add column if not exists reminder_key text;
alter table reminders add column if not exists failure_reason text;

-- status: widen to the full delivery-outcome enum if this database is
-- still on the pre-0011 3-value version (or if 0011's DROP failed
-- because the constraint had already been renamed/removed some other
-- way — IF EXISTS makes the drop safe regardless).
alter table reminders drop constraint if exists reminders_status_check;
alter table reminders add constraint reminders_status_check
  check (status in ('pending', 'sent', 'delivered', 'failed', 'cancelled'));

create unique index if not exists reminders_user_reminder_key_idx on reminders(user_id, reminder_key)
  where reminder_key is not null;

-- Nudge PostgREST to pick up the (possibly just-added) column(s)
-- immediately rather than waiting for its next automatic reload —
-- "pgrst" is PostgREST's default listen channel, so this is the
-- standard way to do this without a project restart.
notify pgrst, 'reload schema';
