-- LifeOS Migration 0006: Diagnostic Tests & Imaging
-- Addendum Sections 1-4: a flexible, test-type-agnostic architecture for
-- imaging and other diagnostic studies (X-Ray, Ultrasound, FibroScan, CT,
-- MRI, ECG/EKG, Echocardiogram, Pulmonary Function Test, DEXA, Other) —
-- distinct from lab_results (a single numeric/text value against a
-- TestDefinition) and distinct from generic Documents (this stores
-- structured findings alongside the preserved original report, not just
-- file metadata).
--
-- test_type is deliberately free text, not a CHECK-constrained enum like
-- every other status/category column in this schema — Addendum Section 2
-- explicitly requires new diagnostic test types to be addable without a
-- database redesign. measurements is a jsonb bag for whatever structured
-- fields a given test_type needs (e.g. FibroScan's
-- liver_stiffness_kpa/cap_dbm/iqr/fasting_status) rather than adding
-- columns per test type, which would force a migration for every new
-- imaging modality.

create table diagnostic_tests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_type text not null,
  category text,
  body_part text,
  study_date date not null,
  facility text,
  provider text,
  indication text,
  findings text,
  impression text,
  measurements jsonb not null default '{}'::jsonb,
  abnormalities text,
  follow_up text,
  notes text,
  related_condition_id uuid references conditions(id) on delete set null,
  source_document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table diagnostic_tests enable row level security;
create policy "diagnostic_tests_all_own" on diagnostic_tests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index diagnostic_tests_user_id_idx on diagnostic_tests(user_id);
create index diagnostic_tests_test_type_idx on diagnostic_tests(test_type);
create index diagnostic_tests_study_date_idx on diagnostic_tests(study_date);

-- SQL-editor-created tables don't inherit the default anon/authenticated
-- grants a normal Supabase migration pipeline provisions automatically —
-- learned this the hard way on the earlier migrations in this project.
grant select, insert, update, delete on diagnostic_tests to anon, authenticated;

-- Extend the timeline polymorphic-reference validator (Spec Section 20)
-- to recognize diagnostic_tests, following the exact documented pattern
-- every other entity type already uses in this function
-- (0003_audit_and_timeline.sql). create or replace is safe here since
-- the original function was already defined that way.
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
    else
      raise exception 'Unknown related_entity_type: %. Add it to validate_timeline_related_entity() when a new domain introduces it.', new.related_entity_type;
  end case;

  if not row_exists then
    raise exception 'related_entity_id % does not exist in table for type % (or is not owned by this user)', new.related_entity_id, new.related_entity_type;
  end if;

  return new;
end;
$$ language plpgsql security definer;
