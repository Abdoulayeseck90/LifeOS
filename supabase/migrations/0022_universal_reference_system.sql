-- LifeOS Migration 0022: Universal Reference Range & Reference Standard System
--
-- Spec: "Do not build separate reference-range logic for every page" —
-- generalizes the Lab-Results-only catalog from migration 0021
-- (test_reference_ranges) into ONE shared table that Labs, Vitals, and
-- future modules all read from, keyed by either a lab test_definition_id
-- OR a generic metric_key (e.g. 'vital:heart_rate', 'body_metric:bmi').
-- This is an evolution of the existing structure (Section 12: "inspect
-- the existing schema... do not create duplicate tables"), not a
-- parallel second table.
alter table test_reference_ranges rename to reference_standards;

-- metric_key is the generic lookup key every module uses going forward
-- (labs use 'lab:<test code>', vitals use 'vital:<type>', body metrics
-- use 'body_metric:<type>'); test_definition_id stays for labs
-- specifically so existing FK-based joins/cascade-deletes keep working.
alter table reference_standards alter column test_definition_id drop not null;
alter table reference_standards add column if not exists metric_key text;
update reference_standards r
  set metric_key = 'lab:' || td.code
  from test_definitions td
  where r.metric_key is null and r.test_definition_id = td.id and td.code is not null;
alter table reference_standards alter column metric_key set not null;

-- The 6-way terminology the spec requires ("must NOT blindly call
-- everything a normal range"): a plain numeric band (reference_range /
-- expected_range — the distinction is presentational, "expected" for
-- naturally variable measurements like temperature), a single-sided
-- threshold (reference_value), a treatment goal (clinical_target), or
-- a named category bracket (guideline_threshold, e.g. AHA blood
-- pressure categories, CDC BMI categories). Existing lab rows all
-- default to 'reference_range', which is exactly what they already are.
alter table reference_standards add column if not exists reference_kind text not null default 'reference_range'
  check (reference_kind in ('reference_range', 'reference_value', 'expected_range', 'clinical_target', 'guideline_threshold', 'not_available'));

-- Populated only for guideline_threshold rows — the category label
-- itself (e.g. "Elevated", "Normal weight").
alter table reference_standards add column if not exists reference_category text;

-- Two-part measurements (blood pressure is the only one today) need
-- two rows per category — one for each component — rather than a
-- second low/high pair bolted on for a single measurement type.
-- Null for every single-value metric (heart rate, BMI, lab results...).
alter table reference_standards add column if not exists component text check (component in ('systolic', 'diastolic'));

-- Distinct from source_version (a page revision) — the named version
-- of the underlying clinical guideline itself, when known.
alter table reference_standards add column if not exists guideline_version text;

-- Expand the source-type vocabulary to the spec's 4 named categories
-- (Section 21) plus a residual "other" bucket, and remap the existing
-- lab values onto it. Looked up and dropped dynamically rather than by
-- a guessed constraint name, since Postgres auto-names differ by
-- version/history.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'reference_standards'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source_type%'
  loop
    execute format('alter table reference_standards drop constraint %I', con.conname);
  end loop;
end $$;

update reference_standards set source_type = 'academic_institution' where source_type = 'medical_institution';
update reference_standards set source_type = 'government_agency' where source_type in ('national_library_of_medicine', 'government_health_agency');
update reference_standards set source_type = 'other_reputable_source' where source_type = 'other_established_source';

alter table reference_standards add constraint reference_standards_source_type_check
  check (source_type in ('laboratory_report', 'government_agency', 'academic_institution', 'clinical_guideline', 'other_reputable_source'));

create index if not exists reference_standards_metric_key_idx on reference_standards(metric_key);

-- Seed data: Vitals/BMI reference standards, each verified by directly
-- fetching the live source page this session (Section 1: never use a
-- search-engine snippet as the authority) — Weight and Height
-- deliberately have NO rows (Spec Sections 9/10: no fake "normal
-- weight/height" range; LifeOS shows trend/change instead, already
-- true of body-metric-latest-card.tsx).
-- No natural unique key (a metric can legitimately gain more curated
-- rows later, and blood pressure/temperature intentionally have
-- several rows each) — idempotency is enforced by skipping any
-- metric_key that already has at least one row, so re-running this
-- migration file is a no-op rather than duplicating.
insert into reference_standards
  (metric_key, reference_kind, reference_low, reference_high, reference_category, component, unit, applicable_population, source_name, source_url, source_type, retrieved_at)
select v.metric_key, v.reference_kind, v.reference_low, v.reference_high, v.reference_category, v.component, v.unit, v.applicable_population, v.source_name, v.source_url, v.source_type, current_date
from (
  values
  -- Heart Rate — Cleveland Clinic, https://my.clevelandclinic.org/health/articles/10881-vital-signs ("60 to 100 beats per minute")
  ('vital:heart_rate', 'expected_range', 60::numeric, 100::numeric, null::text, null::text, 'bpm', 'General resting adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/articles/10881-vital-signs', 'academic_institution'),

  -- Respiratory Rate — same Cleveland Clinic page ("12 to 18 breaths per minute")
  ('vital:respiratory_rate', 'expected_range', 12, 18, null, null, 'breaths/min', 'General resting adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/articles/10881-vital-signs', 'academic_institution'),

  -- Temperature — same Cleveland Clinic page ("97.8 F to 99.1 F (36.5 C to 37.3 C)") — one row per unit LifeOS supports.
  ('vital:temperature', 'expected_range', 36.5, 37.3, null, null, '°C', 'General adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/articles/10881-vital-signs', 'academic_institution'),
  ('vital:temperature', 'expected_range', 97.8, 99.1, null, null, '°F', 'General adult', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/articles/10881-vital-signs', 'academic_institution'),

  -- SpO2 — Cleveland Clinic, https://my.clevelandclinic.org/health/diagnostics/pulse-oximetry ("A normal level is from 95% to 100% for all ages")
  ('vital:spo2', 'expected_range', 95, 100, null, null, '%', 'All ages', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/diagnostics/pulse-oximetry', 'academic_institution'),

  -- Blood Pressure — American Heart Association guideline categories,
  -- https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings
  -- Two rows per category (systolic + diastolic component); the
  -- resolver takes whichever dimension implies the HIGHER category,
  -- matching AHA's own "you're in the higher category" rule.
  ('vital:blood_pressure', 'guideline_threshold', null, 119, 'Normal', 'systolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', null, 79, 'Normal', 'diastolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', 120, 129, 'Elevated', 'systolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', null, 79, 'Elevated', 'diastolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', 130, 139, 'Stage 1 Hypertension', 'systolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', 80, 89, 'Stage 1 Hypertension', 'diastolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', 140, null, 'Stage 2 Hypertension', 'systolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', 90, null, 'Stage 2 Hypertension', 'diastolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', 181, null, 'Hypertensive Crisis', 'systolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),
  ('vital:blood_pressure', 'guideline_threshold', 121, null, 'Hypertensive Crisis', 'diastolic', 'mmHg', 'Adult', 'American Heart Association', 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings', 'clinical_guideline'),

  -- BMI categories — CDC, https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
  -- CDC states half-open bounds ("18.5 to less than 25", etc.); this
  -- schema only stores inclusive low/high, so boundaries are
  -- approximated to two decimal places (e.g. 18.49 for "below 18.5") —
  -- accurate for any BMI value reported to the conventional 1-2
  -- decimal places.
  ('body_metric:bmi', 'guideline_threshold', null, 18.49, 'Underweight', null, 'kg/m²', 'Adult (20+)', 'Centers for Disease Control and Prevention (CDC)', 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html', 'government_agency'),
  ('body_metric:bmi', 'guideline_threshold', 18.5, 24.99, 'Healthy weight', null, 'kg/m²', 'Adult (20+)', 'Centers for Disease Control and Prevention (CDC)', 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html', 'government_agency'),
  ('body_metric:bmi', 'guideline_threshold', 25, 29.99, 'Overweight', null, 'kg/m²', 'Adult (20+)', 'Centers for Disease Control and Prevention (CDC)', 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html', 'government_agency'),
  ('body_metric:bmi', 'guideline_threshold', 30, null, 'Obesity', null, 'kg/m²', 'Adult (20+)', 'Centers for Disease Control and Prevention (CDC)', 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html', 'government_agency')
) as v(metric_key, reference_kind, reference_low, reference_high, reference_category, component, unit, applicable_population, source_name, source_url, source_type)
where not exists (select 1 from reference_standards existing where existing.metric_key = v.metric_key);

notify pgrst, 'reload schema';
