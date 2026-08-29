-- LifeOS Migration 0007: Health Monitoring Plans & Items
-- Addendum Sections 6-11: guideline-based, clinician-defined, or
-- user-defined monitoring schedules that track what's due, when, and
-- why, and calculate the next occurrence when an item is completed.
--
-- Design notes (deviating slightly from the addendum's literal schema
-- draft — see chat for full rationale):
-- 1. status only stores 'active' | 'completed' | 'cancelled' | 'deferred'
--    — the addendum's upcoming/due_soon/due/overdue are time-relative to
--    next_due_at and are computed at read time (services/health/
--    monitoring.ts), not stored, since nothing re-scans rows as time
--    passes to keep a stored version from going stale.
-- 2. No separate `active` boolean or `clinician_defined` boolean —
--    `status` and `source` already fully cover both distinctions without
--    a second field that could drift out of sync with the first.
-- 3. No guideline_id yet — added via ALTER TABLE once the guidelines
--    table exists (a later migration), not as a dangling FK-less column
--    now.
-- interval_value/interval_unit drive automatic next-due-date calculation
-- for recurring items; frequency_note covers schedules that don't reduce
-- to a clean interval (e.g. "as needed") and have no auto-calculated
-- next due date — the user sets next_due_at manually for those.

create table monitoring_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  condition_id uuid references conditions(id) on delete set null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  clinician_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table monitoring_plans enable row level security;
create policy "monitoring_plans_all_own" on monitoring_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index monitoring_plans_user_id_idx on monitoring_plans(user_id);

create table monitoring_items (
  id uuid primary key default uuid_generate_v4(),
  monitoring_plan_id uuid not null references monitoring_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  test_type text,
  interval_value integer,
  interval_unit text check (interval_unit in ('days', 'weeks', 'months', 'years')),
  frequency_note text,
  last_completed_at date,
  next_due_at date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'deferred')),
  source text not null default 'user' check (source in ('guideline', 'clinician', 'user')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitoring_items_interval_pair check (
    (interval_value is null and interval_unit is null) or (interval_value is not null and interval_unit is not null)
  )
);
alter table monitoring_items enable row level security;
create policy "monitoring_items_all_own" on monitoring_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index monitoring_items_user_id_idx on monitoring_items(user_id);
create index monitoring_items_plan_id_idx on monitoring_items(monitoring_plan_id);
create index monitoring_items_next_due_at_idx on monitoring_items(next_due_at);

grant select, insert, update, delete on monitoring_plans to anon, authenticated;
grant select, insert, update, delete on monitoring_items to anon, authenticated;

-- Extend the timeline validator again (same pattern as 0006) so a
-- "monitoring completed" event can reference the monitoring_items row it
-- came from.
create or replace function validate_timeline_related_entity()
returns trigger as $$
declare
  row_exists boolean;
begin
  if new.related_entity_type is null or new.related_entity_id is null then
    return new;
  end if;

  case new.related_entity_type
    when 'condition' then
      select exists(select 1 from conditions where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'lab_result' then
      select exists(select 1 from lab_results where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'medication' then
      select exists(select 1 from medications where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'appointment' then
      select exists(select 1 from appointments where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'symptom_entry' then
      select exists(select 1 from symptom_entries where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'body_metric' then
      select exists(select 1 from body_metrics where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'document' then
      select exists(select 1 from documents where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'diagnostic_test' then
      select exists(select 1 from diagnostic_tests where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'monitoring_item' then
      select exists(select 1 from monitoring_items where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    else
      raise exception 'Unknown related_entity_type: %. Add it to validate_timeline_related_entity() when a new domain introduces it.', new.related_entity_type;
  end case;

  if not row_exists then
    raise exception 'related_entity_id % does not exist in table for type % (or is not owned by this user)', new.related_entity_id, new.related_entity_type;
  end if;

  return new;
end;
$$ language plpgsql security definer;
