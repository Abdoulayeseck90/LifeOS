-- LifeOS Migration 0015: Fix reminders ON CONFLICT inference (idempotent)
--
-- Fixes: 42P10 "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification", raised from upsertReminder()
-- (src/services/core/reminders.ts), which does:
--   .upsert(row, { onConflict: "user_id,reminder_key" })
-- i.e. INSERT ... ON CONFLICT (user_id, reminder_key) DO UPDATE ..., with
-- no WHERE clause on the ON CONFLICT target (the supabase-js client has
-- no option to add one).
--
-- reminders_user_reminder_key_idx (0011_notification_scheduling.sql,
-- re-created in 0013_reminders_schema_repair.sql) was created as a
-- PARTIAL unique index: `where reminder_key is not null`. Postgres will
-- only use a partial index for ON CONFLICT inference if the ON CONFLICT
-- clause repeats that exact predicate — an unqualified
-- "ON CONFLICT (user_id, reminder_key)" cannot match it, so every
-- upsert against this index fails with 42P10. The original partial
-- index was meant to exempt legacy rows with a null reminder_key from
-- the uniqueness check, but that's unnecessary: standard SQL unique
-- indexes already treat every NULL as distinct from every other NULL,
-- so a plain (non-partial) unique index on (user_id, reminder_key)
-- still allows unlimited null-reminder_key rows without collision,
-- while also being a valid ON CONFLICT inference target.

drop index if exists reminders_user_reminder_key_idx;
create unique index if not exists reminders_user_reminder_key_idx on reminders(user_id, reminder_key);

notify pgrst, 'reload schema';
