-- LifeOS Migration 0009: Reminder Engine (in-app delivery)
-- Addendum Section 12: a reusable reminder architecture, not coupled to
-- Health — the same engine should later serve Tasks, Projects, and other
-- domains. Nothing here references "health" in a table/column name.
--
-- Architecture note: notifications (0001_core.sql) already existed with
-- exactly the shape an in-app delivery inbox needs (title, body, read,
-- category) but had gone completely unused until now. Rather than
-- duplicate that with a second title/body/read table, this migration
-- splits the concern cleanly:
--   reminders    — the scheduling/rule layer: WHEN something should be
--                  reminded about, WHY (linked entity), and via which
--                  channel. Rows here are system-generated (by the
--                  monitoring API routes today), not directly
--                  user-created yet — that UI is a later build step.
--   notifications — the delivery inbox. A reminder firing writes one
--                  notification row for in-app display. Extended here
--                  with the same related_entity_type/id + trigger
--                  validation pattern as timeline_events, so a
--                  notification can link back to what it's about.
--
-- delivery_channel is a plain enum column (in_app/email/push) — never
-- hardcoded to one channel — so future push delivery is just a new
-- enum value and a new sender, not a schema change.

create table reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  related_entity_type text,
  related_entity_id uuid,
  delivery_channel text not null default 'in_app' check (delivery_channel in ('in_app', 'email', 'push')),
  lead_time_days integer not null default 0,
  scheduled_for timestamptz not null,
  title text not null,
  body text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'cancelled')),
  sent_at timestamptz,
  notification_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table reminders enable row level security;
create policy "reminders_all_own" on reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index reminders_user_id_idx on reminders(user_id);
create index reminders_scheduled_for_idx on reminders(scheduled_for);
create index reminders_status_idx on reminders(status);

alter table notifications add column related_entity_type text;
alter table notifications add column related_entity_id uuid;
alter table notifications add column updated_at timestamptz not null default now();

alter table reminders add constraint reminders_notification_id_fkey
  foreign key (notification_id) references notifications(id) on delete set null;

grant select, insert, update, delete on reminders to anon, authenticated;
grant select, insert, update, delete on notifications to anon, authenticated;

-- Reuse validate_timeline_related_entity (0003/0006/0007) verbatim by
-- attaching it to both new/extended tables — they share the exact same
-- related_entity_type/related_entity_id/user_id column shape as
-- timeline_events, so the existing function works unmodified. This is
-- the literal reuse the addendum asks for, not a second validator.
create trigger validate_reminders_related_entity_trigger
  before insert or update on reminders
  for each row execute procedure validate_timeline_related_entity();

create trigger validate_notifications_related_entity_trigger
  before insert or update on notifications
  for each row execute procedure validate_timeline_related_entity();
