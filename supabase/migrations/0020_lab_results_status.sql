-- LifeOS Migration 0020: Lab Results — status + reference-range history
--
-- Inspected the existing schema first (Spec Section 14): lab_results
-- (0002_health.sql) already stores per-result reference_low/high/text,
-- unit, value_numeric/value_text, collection_date, ordering_provider,
-- facility, source_document_id, notes — exactly Section 14's field
-- list, already keyed per individual result (not a shared global range
-- per test — Section 5 requirement already satisfied by the existing
-- design). The one genuinely missing concept is an explicit status
-- LifeOS should preserve verbatim when the source lab already states
-- one (Section 6), rather than always deriving High/Low/Normal from
-- the numeric reference range.
--
-- result_status is deliberately a small fixed vocabulary matching
-- Section 6's own enumerated list (Critical is never computed by
-- LifeOS — it can only ever come from here, preserving what a source
-- record stated) rather than free text, so the UI never has to guess
-- semantics from arbitrary lab wording. Null means "not specified by
-- the source" and falls back to the existing computed low/normal/high
-- logic (lib/health/lab-level.ts).
alter table lab_results add column if not exists result_status text
  check (result_status in ('normal', 'low', 'high', 'critical', 'abnormal'));

-- Reference-only long-form names for the shared test catalog (Spec
-- Section 3's "AST / Aspartate Aminotransferase" subtitle example).
-- This is standard laboratory terminology, not user medical data, and
-- only fills in rows seeded by supabase/seed.sql that never got a
-- description — never overwrites a value already present.
update test_definitions set description = 'Aspartate Aminotransferase' where code = 'AST' and description is null;
update test_definitions set description = 'Alanine Aminotransferase' where code = 'ALT' and description is null;
update test_definitions set description = 'Alkaline Phosphatase' where code = 'ALP' and description is null;
update test_definitions set description = 'Gamma-Glutamyl Transferase' where code = 'GGT' and description is null;
update test_definitions set description = 'Total Bilirubin' where code = 'TBIL' and description is null;
update test_definitions set description = 'Total Protein' where code = 'TP' and description is null;
update test_definitions set description = 'Hepatitis B Virus DNA' where code = 'HBV-DNA' and description is null;
update test_definitions set description = 'Hepatitis B Surface Antigen' where code = 'HBSAG' and description is null;
update test_definitions set description = 'Hepatitis B e-Antigen' where code = 'HBEAG' and description is null;
update test_definitions set description = 'Antibody to Hepatitis B e-Antigen' where code = 'ANTIHBE' and description is null;
update test_definitions set description = 'Antibody to Hepatitis B Surface Antigen' where code = 'ANTIHBS' and description is null;
update test_definitions set description = 'Antibody to Hepatitis B Core Antigen' where code = 'ANTIHBC' and description is null;
update test_definitions set description = 'Creatinine' where code = 'CREAT' and description is null;
update test_definitions set description = 'Estimated Glomerular Filtration Rate' where code = 'EGFR' and description is null;
update test_definitions set description = 'Blood Urea Nitrogen' where code = 'BUN' and description is null;
update test_definitions set description = 'Urine Protein' where code = 'UPROT' and description is null;
update test_definitions set description = 'White Blood Cell Count' where code = 'WBC' and description is null;
update test_definitions set description = 'Red Blood Cell Count' where code = 'RBC' and description is null;
update test_definitions set description = 'Hemoglobin' where code = 'HGB' and description is null;
update test_definitions set description = 'Hematocrit' where code = 'HCT' and description is null;
update test_definitions set description = 'Platelet Count' where code = 'PLT' and description is null;
update test_definitions set description = 'Fasting Glucose' where code = 'GLU' and description is null;
update test_definitions set description = 'Glycated Hemoglobin' where code = 'HBA1C' and description is null;
update test_definitions set description = 'Total Cholesterol' where code = 'TCHOL' and description is null;
update test_definitions set description = 'Low-Density Lipoprotein Cholesterol' where code = 'LDL' and description is null;
update test_definitions set description = 'High-Density Lipoprotein Cholesterol' where code = 'HDL' and description is null;
update test_definitions set description = 'Triglycerides' where code = 'TRIG' and description is null;

notify pgrst, 'reload schema';
