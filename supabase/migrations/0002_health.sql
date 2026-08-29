-- LifeOS Migration 0002: Health domain
-- Spec Sections 9-20. Generic and condition-agnostic — Hepatitis B is
-- seed data in test_definitions, not a hard-coded table (Spec 43).

create table conditions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  diagnosis_date date,
  status text not null default 'active' check (status in ('active', 'monitoring', 'resolved')),
  description text,
  provider_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table conditions enable row level security;
create policy "conditions_all_own" on conditions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index conditions_user_id_idx on conditions(user_id);

-- test_definitions is shared reference data, not user-owned — readable
-- by any authenticated user, writable only via migration/seed (Spec 11).
-- Bilingual per Spec 6.3: name_en / name_fr rather than a single column.
create table test_definitions (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_fr text not null,
  code text,
  category text not null check (category in ('hepatitis_b', 'liver', 'kidney_renal', 'blood_cbc', 'metabolic', 'other')),
  default_unit text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table test_definitions enable row level security;
create policy "test_definitions_read_all" on test_definitions
  for select using (auth.role() = 'authenticated');

create table lab_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_definition_id uuid not null references test_definitions(id),
  category text not null,
  value_numeric numeric,
  value_text text,
  unit text,
  reference_low numeric,
  reference_high numeric,
  reference_text text,
  abnormal_flag boolean not null default false,
  collection_date date not null,
  result_date date,
  ordering_provider text,
  facility text,
  source_document_id uuid references documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_results_value_present check (value_numeric is not null or value_text is not null)
);
alter table lab_results enable row level security;
create policy "lab_results_all_own" on lab_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index lab_results_user_id_idx on lab_results(user_id);
create index lab_results_test_definition_idx on lab_results(test_definition_id);
create index lab_results_collection_date_idx on lab_results(collection_date);

create table medications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dose text,
  unit text,
  frequency text,
  route text,
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'discontinued', 'planned')),
  prescriber text,
  reason text,
  instructions text,
  side_effect_notes text,
  related_condition_id uuid references conditions(id) on delete set null,
  source_document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table medications enable row level security;
create policy "medications_all_own" on medications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index medications_user_id_idx on medications(user_id);

create table appointments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_name text not null,
  specialty text,
  appointment_type text,
  date_time timestamptz not null,
  location text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  preparation_notes text,
  clinician_instructions text,
  follow_up_date date,
  related_condition_id uuid references conditions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table appointments enable row level security;
create policy "appointments_all_own" on appointments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index appointments_user_id_idx on appointments(user_id);
create index appointments_date_time_idx on appointments(date_time);

create table doctor_questions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text,
  answered boolean not null default false,
  needs_follow_up boolean not null default false,
  related_condition_id uuid references conditions(id) on delete set null,
  related_appointment_id uuid references appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table doctor_questions enable row level security;
create policy "doctor_questions_all_own" on doctor_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index doctor_questions_user_id_idx on doctor_questions(user_id);

create table symptom_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symptom text not null,
  severity smallint check (severity between 1 and 10),
  onset text,
  duration text,
  frequency text,
  context text,
  notes text,
  related_condition_id uuid references conditions(id) on delete set null,
  appointment_reference_id uuid references appointments(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table symptom_entries enable row level security;
create policy "symptom_entries_all_own" on symptom_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index symptom_entries_user_id_idx on symptom_entries(user_id);

create table body_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_type text not null check (metric_type in ('weight', 'height', 'bmi', 'waist_circumference', 'body_fat_percentage')),
  value numeric not null,
  unit text not null,
  measured_at timestamptz not null,
  source text,
  notes text,
  created_at timestamptz not null default now()
);
alter table body_metrics enable row level security;
create policy "body_metrics_all_own" on body_metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index body_metrics_user_id_idx on body_metrics(user_id);
create index body_metrics_measured_at_idx on body_metrics(measured_at);

-- Nutrition — V1 scope trimmed per Spec Section 51.1: meal logging +
-- clinician restrictions only. No food database / macro tracking table
-- in V1; that is Phase 6.
create table meal_log_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  notes text,
  created_at timestamptz not null default now()
);
alter table meal_log_entries enable row level security;
create policy "meal_log_entries_all_own" on meal_log_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index meal_log_entries_user_id_idx on meal_log_entries(user_id);

create table nutrition_restrictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restriction text not null,
  source text not null check (source in ('clinician', 'self_reported')),
  related_condition_id uuid references conditions(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table nutrition_restrictions enable row level security;
create policy "nutrition_restrictions_all_own" on nutrition_restrictions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index nutrition_restrictions_user_id_idx on nutrition_restrictions(user_id);
