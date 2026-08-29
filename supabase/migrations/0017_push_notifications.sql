-- LifeOS Migration 0017: Push Notifications
-- Push becomes the primary reminder channel alongside in-app; email
-- stays available but optional (Master Redesign: "Push + In-App —
-- PRIMARY, Email — OPTIONAL"). delivery_channel on `reminders` already
-- included 'push' from day one (0009_reminders.sql: "delivery_channel
-- is a plain enum column... so future push delivery is just a new enum
-- value and a new sender, not a schema change") — this migration adds
-- the piece that was actually missing: somewhere to store *what* to
-- push to.

-- One user can have several browsers/devices subscribed at once (Spec
-- Section 7: "Do NOT assume one user has only one device") — endpoint
-- is the Push API's own unique-per-registration URL, so (user_id,
-- endpoint) is the natural uniqueness key, not a single row per user.
create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  -- Best-effort human label derived from the User-Agent at subscribe
  -- time (e.g. "Chrome on Windows") for the Settings "Your Devices"
  -- list (Spec Section 19) — not parsed/relied on for anything
  -- functional, purely cosmetic.
  device_label text,
  user_agent text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
alter table push_subscriptions enable row level security;
create policy "push_subscriptions_all_own" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index push_subscriptions_user_id_idx on push_subscriptions(user_id);
create index push_subscriptions_status_idx on push_subscriptions(status);

grant select, insert, update, delete on push_subscriptions to anon, authenticated;

-- New default for brand-new profiles: push+in_app ON, email OFF for all
-- 3 categories (Spec Section 1 — a deliberate policy change from
-- 0011_notification_scheduling.sql's original appointments/monitoring
-- email:true default). This only affects the column DEFAULT applied to
-- rows inserted from now on.
alter table profiles alter column notification_preferences set default '{
  "appointments": {"push": true, "in_app": true, "email": false},
  "monitoring": {"push": true, "in_app": true, "email": false},
  "general_activity": {"push": true, "in_app": true, "email": false},
  "email_timing": {"seven_day": true, "three_day": true, "one_day": true, "day_of": false},
  "overdue_email_enabled": true,
  "overdue_email_recurring": false
}'::jsonb;

-- Existing users: only backfill the brand-new `push` field (default ON,
-- matching the new primary-channel policy) into whatever preferences
-- object they already have. Every other field — including any email
-- toggle a user may have deliberately changed — is left exactly as it
-- already is; this is additive, never a silent override of a user's
-- prior choice (see 0012_notification_preferences_backfill.sql for the
-- same non-destructive pattern).
update profiles
set notification_preferences = jsonb_set(
  jsonb_set(
    jsonb_set(notification_preferences, '{appointments,push}', 'true'),
    '{monitoring,push}', 'true'
  ),
  '{general_activity,push}', 'true'
)
where notification_preferences->'appointments'->'push' is null;

notify pgrst, 'reload schema';
