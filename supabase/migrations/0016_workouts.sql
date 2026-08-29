-- LifeOS Migration 0016: Workouts (Exercise & Fitness)
-- New "Exercise & Fitness" Health section — separate from Vitals per the
-- spec's explicit "Vitals = how is my body measuring, Exercise = what
-- did I do" split. Inspected the existing schema first: no workout/
-- exercise table existed yet, so this is a genuinely new table, not a
-- repair.
--
-- One row per logged workout session (not a per-set/per-exercise
-- relational model) — sets/reps/weight_resistance are simple nullable
-- columns representing a single strength session's summary (e.g. "3
-- sets x 10 reps @ 135 lb"), not a normalized exercises/sets hierarchy.
-- That's a deliberate MVP scope call (spec Section 7/19: "only implement
-- fields that fit the current architecture... do not create unnecessary
-- complexity" / "do not overbuild") — a full per-exercise/per-set model
-- can be layered on top of this table later without breaking it.
--
-- status distinguishes a logged-after-the-fact workout ('completed',
-- the only value the current UI writes) from a possible future
-- scheduled-workout-on-Calendar feature ('scheduled') per spec Section
-- 14 — the column exists now so that future integration doesn't require
-- a schema change, but no scheduling UI is built yet.

create table workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_type text not null check (workout_type in ('walking', 'running', 'cycling', 'strength', 'other')),
  status text not null default 'completed' check (status in ('completed', 'scheduled', 'cancelled')),
  started_at timestamptz not null,
  duration_minutes integer,
  distance_value numeric,
  distance_unit text,
  calories numeric,
  steps integer,
  sets integer,
  reps integer,
  weight_resistance numeric,
  weight_unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table workouts enable row level security;
create policy "workouts_all_own" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index workouts_user_id_idx on workouts(user_id);
create index workouts_started_at_idx on workouts(started_at);
create index workouts_workout_type_idx on workouts(workout_type);

grant select, insert, update, delete on workouts to anon, authenticated;

-- Extend the timeline validator again (same pattern as 0006/0007/0014) so
-- a "workout logged" event can reference the workouts row it came from.
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
    when 'workout' then
      select exists(select 1 from workouts where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    else
      raise exception 'Unknown related_entity_type: %. Add it to validate_timeline_related_entity() when a new domain introduces it.', new.related_entity_type;
  end case;

  if not row_exists then
    raise exception 'related_entity_id % does not exist in table for type % (or is not owned by this user)', new.related_entity_id, new.related_entity_type;
  end if;

  return new;
end;
$$ language plpgsql security definer;
