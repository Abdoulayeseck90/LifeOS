-- LifeOS Migration 0014: Vitals
-- New "Vitals" module — the central place for measurable body readings
-- (Blood Pressure, Heart Rate, Temperature, SpO2, Respiratory Rate).
-- Weight is deliberately NOT duplicated here: it already has a working,
-- generic home in body_metrics (0002_health.sql) and stays there — only
-- the UI/nav location moves under Vitals (see sidebar-nav-content.tsx),
-- not the data model, so no weight data migration is needed here.
--
-- One generic table, not table-per-vital-type (same rationale as
-- body_metrics/diagnostic_tests): vital_type is a discriminator and
-- only Blood Pressure has a real create form today (Heart Rate,
-- Temperature, SpO2, Respiratory Rate are structured in but not yet
-- exposed in the UI — "structure it so more vitals can be added later"
-- was an explicit requirement). Blood pressure's shape (systolic +
-- diastolic + pulse + position + arm) doesn't fit a single value/unit
-- pair, so those get their own nullable columns; the remaining
-- single-value vital types share a generic value/unit pair instead of
-- each getting their own column, and heart_rate reuses the same `pulse`
-- column a blood-pressure reading's pulse is stored in, since both are
-- literally the same measurement (bpm).

create table vitals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vital_type text not null check (vital_type in ('blood_pressure', 'heart_rate', 'temperature', 'spo2', 'respiratory_rate')),
  recorded_at timestamptz not null,
  systolic numeric,
  diastolic numeric,
  pulse numeric,
  position text check (position in ('sitting', 'standing', 'lying')),
  arm text check (arm in ('left', 'right')),
  value numeric,
  unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vitals_required_fields_by_type check (
    (vital_type = 'blood_pressure' and systolic is not null and diastolic is not null)
    or (vital_type = 'heart_rate' and pulse is not null)
    or (vital_type in ('temperature', 'spo2', 'respiratory_rate') and value is not null)
  )
);
alter table vitals enable row level security;
create policy "vitals_all_own" on vitals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index vitals_user_id_idx on vitals(user_id);
create index vitals_recorded_at_idx on vitals(recorded_at);
create index vitals_vital_type_idx on vitals(vital_type);

grant select, insert, update, delete on vitals to anon, authenticated;

-- Extend the timeline validator again (same pattern as 0006/0007) so a
-- "vital recorded" event can reference the vitals row it came from.
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
    when 'vital' then
      select exists(select 1 from vitals where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    else
      raise exception 'Unknown related_entity_type: %. Add it to validate_timeline_related_entity() when a new domain introduces it.', new.related_entity_type;
  end case;

  if not row_exists then
    raise exception 'related_entity_id % does not exist in table for type % (or is not owned by this user)', new.related_entity_id, new.related_entity_type;
  end if;

  return new;
end;
$$ language plpgsql security definer;
