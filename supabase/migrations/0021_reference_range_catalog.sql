-- LifeOS Migration 0021: Reference Range Source System
--
-- Spec: "Reference Range Source System" — a laboratory-provided range
-- (already stored per-result on lab_results, migration 0002) is always
-- authoritative. This migration adds the FALLBACK tier only: a small,
-- curated, shared catalog of general reference ranges from approved
-- trusted sources, used ONLY when a specific result has no
-- laboratory-provided range at all. It never overrides a lab range.
--
-- Mirrors test_definitions exactly (0002_health.sql): shared reference
-- data, not user-owned, read-only to authenticated users, writable
-- only via migration/seed — never through the app's own write paths.
create table test_reference_ranges (
  id uuid primary key default uuid_generate_v4(),
  test_definition_id uuid not null references test_definitions(id) on delete cascade,
  reference_low numeric,
  reference_high numeric,
  unit text,
  -- Descriptive only (Section 5) — LifeOS has no structured patient
  -- age/sex/pregnancy data to match against, so this is never used to
  -- auto-select a range. When a test has more than one population
  -- variant, the UI shows all of them, each honestly labeled, rather
  -- than silently picking one and presenting it as "the" general range.
  applicable_population text,
  source_name text not null,
  source_url text not null,
  source_type text not null check (source_type in ('national_library_of_medicine', 'medical_institution', 'government_health_agency', 'other_established_source')),
  source_version text,
  retrieved_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table test_reference_ranges enable row level security;
create policy "test_reference_ranges_read_all" on test_reference_ranges
  for select using (auth.role() = 'authenticated');
create index test_reference_ranges_test_definition_id_idx on test_reference_ranges(test_definition_id);

-- Seed data: ONLY tests where a specific number was directly confirmed
-- on the live source page (fetched and quoted verbatim this session),
-- not a search-engine summary or a secondary/aggregator site (Spec
-- Section 10: "NEVER use Google snippets as the medical authority").
-- Every other seeded test in the catalog (Creatinine, BUN, Glucose,
-- HbA1c, Cholesterol/LDL/HDL/Triglycerides, Total Protein, the
-- Hepatitis B serology panel) intentionally has NO row here yet,
-- because a single, unambiguous, directly-verifiable figure could not
-- be confirmed against one live source page in this pass — those
-- results correctly show "Reference range not available" until either
-- the user's own lab provides one or a future pass adds a verified
-- entry. This is a deliberate scope decision, not a bug.
-- No natural unique key on this table (a test can legitimately gain more
-- curated rows later), so idempotency is enforced explicitly: only seed
-- a test_definition that doesn't already have ANY catalog row, so
-- re-running this migration file is a no-op rather than duplicating.
insert into test_reference_ranges
  (test_definition_id, reference_low, reference_high, unit, applicable_population, source_name, source_url, source_type, retrieved_at)
select v.id, v.reference_low, v.reference_high, v.unit, v.applicable_population, v.source_name, v.source_url, v.source_type, current_date
from (
  select id, 8::numeric as reference_low, 33::numeric as reference_high, 'U/L' as unit, 'Adult' as applicable_population, 'Cleveland Clinic' as source_name, 'https://my.clevelandclinic.org/health/diagnostics/22147-aspartate-transferase-ast' as source_url, 'medical_institution' as source_type
  from test_definitions where code = 'AST'
  union all
  select id, 7, 56, 'U/L', 'Adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/22028-alanine-transaminase-alt', 'medical_institution'
  from test_definitions where code = 'ALT'
  union all
  select id, 44, 147, 'U/L', 'Adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/22029-alkaline-phosphatase-alp', 'medical_institution'
  from test_definitions where code = 'ALP'
  union all
  select id, 3.5, 5.5, 'g/dL', 'Adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/22390-albumin-blood-test', 'medical_institution'
  from test_definitions where code = 'ALB'
  union all
  select id, null, 50, 'U/L', 'Adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/22055-gamma-glutamyl-transferase-ggt-test', 'medical_institution'
  from test_definitions where code = 'GGT'
  union all
  select id, 0.2, 1.3, 'mg/dL', 'Adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/17845-bilirubin', 'medical_institution'
  from test_definitions where code = 'TBIL'
  union all
  select id, 4.0, 10.0, 'x10^9/L', 'Adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'WBC'
  union all
  select id, 150, 400, 'x10^9/L', 'Adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'PLT'
  -- Sex-specific per the source itself — both stored, neither presented
  -- as "the" default (Section 5).
  union all
  select id, 4.5, 6.1, 'x10^12/L', 'Adult male', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'RBC'
  union all
  select id, 4.0, 5.4, 'x10^12/L', 'Adult female', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'RBC'
  union all
  select id, 13, 17, 'g/dL', 'Adult male', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'HGB'
  union all
  select id, 11.5, 15.5, 'g/dL', 'Adult female', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'HGB'
  union all
  select id, 40, 55, '%', 'Adult male', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'HCT'
  union all
  select id, 36, 48, '%', 'Adult female', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/4053-complete-blood-count', 'medical_institution'
  from test_definitions where code = 'HCT'
) v(id, reference_low, reference_high, unit, applicable_population, source_name, source_url, source_type)
where not exists (select 1 from test_reference_ranges existing where existing.test_definition_id = v.id);

notify pgrst, 'reload schema';
