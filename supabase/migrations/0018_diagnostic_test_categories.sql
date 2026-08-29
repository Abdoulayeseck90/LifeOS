-- LifeOS Migration 0018: Diagnostic Tests & Imaging — categories
--
-- Inspected the existing schema first: diagnostic_tests
-- (0006_diagnostic_tests.sql) already has a `category` column — it was
-- added for exactly this purpose but the UI never wrote to it, so every
-- existing row has category = null. This migration does NOT create a
-- new table; it backfills the column that was already there and adds a
-- light CHECK constraint now that the 5 top-level categories are fixed
-- and enumerable (unlike test_type, which stays free text — Addendum
-- Section 2 requires new test types without a schema change; the 5
-- categories are a stable, spec-fixed taxonomy, not something new
-- categories get invented for).
--
-- Backfill maps each existing test_type to its category so no existing
-- record becomes "uncategorized" in the new tabbed UI — every row that
-- already had a category (there are none today, but the CASE is
-- written defensively) keeps it untouched.

alter table diagnostic_tests add constraint diagnostic_tests_category_check
  check (category is null or category in ('imaging', 'cardiology', 'pathology', 'microbiology', 'other'));

update diagnostic_tests
set category = case
  when category is not null then category
  when test_type in ('xray', 'ultrasound', 'fibroscan', 'ct', 'mri', 'dexa', 'pet') then 'imaging'
  when test_type in ('ecg', 'echocardiogram', 'stress_test', 'holter_monitor') then 'cardiology'
  when test_type in ('biopsy') then 'pathology'
  when test_type in ('culture', 'microbiology_testing') then 'microbiology'
  else 'other'
end
where category is null;

notify pgrst, 'reload schema';
