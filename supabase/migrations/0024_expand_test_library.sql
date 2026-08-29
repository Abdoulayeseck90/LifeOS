-- LifeOS Migration 0024: Expand Lab Test Selection & Custom Test Support
-- — expanded bilingual test library
--
-- Spec Sections 2-12: extends the existing test_definitions catalog
-- (seed.sql's original 26 tests are untouched — every code below is
-- new, verified against the existing seed list) with the additional
-- tests the spec explicitly lists, plus 5 new categories (Thyroid,
-- Iron/Nutrition, Inflammation/Immune, Pancreas, Cardiovascular).
-- Standard, non-controversial lab test names/abbreviations — not
-- patient data, and not implying any test is required (Section 25:
-- availability in this catalog is never a recommendation).
--
-- Idempotency: migration 0023 already enforces uniqueness at the
-- database level via a partial unique index
-- (test_definitions_global_code_unique, predicate: user_id is null
-- and code is not null). This migration originally tried to piggyback
-- on that index as an ON CONFLICT arbiter, but Postgres requires an ON
-- CONFLICT predicate to match an index's predicate EXACTLY — the index
-- has TWO conditions (user_id is null AND code is not null) while this
-- statement only specified one (user_id is null), so Postgres couldn't
-- find a matching arbiter (error 42P10). Fixed by dropping ON CONFLICT
-- entirely in favor of an explicit WHERE NOT EXISTS guard, which
-- checks the actual data rather than depending on an index predicate
-- staying in lockstep with this file — the same pattern already used
-- in migration 0022's seed section. The 0023 index itself is untouched
-- and still provides real DB-level protection independent of this.
insert into test_definitions (name_en, name_fr, code, category, default_unit)
select v.name_en, v.name_fr, v.code, v.category, v.default_unit
from (
  values
  -- Hepatitis B / Virology — additions alongside the existing 6
  ('Anti-HBc Total', 'Anti-HBc totaux', 'ANTIHBCTOT', 'hepatitis_b', null),
  ('Anti-HBc IgM', 'Anti-HBc IgM', 'ANTIHBCIGM', 'hepatitis_b', null),
  ('HBV Genotype', 'Génotype du VHB', 'HBVGENO', 'hepatitis_b', null),
  ('Hepatitis B DNA Quantitative', 'ADN du VHB quantitatif', 'HBVDNAQUANT', 'hepatitis_b', 'IU/mL'),
  ('Hepatitis B DNA Qualitative', 'ADN du VHB qualitatif', 'HBVDNAQUAL', 'hepatitis_b', null),

  -- Liver / Hepatic — additions
  ('Direct Bilirubin', 'Bilirubine directe', 'DBIL', 'liver', 'mg/dL'),
  ('Indirect Bilirubin', 'Bilirubine indirecte', 'IBIL', 'liver', 'mg/dL'),
  ('LDH', 'LDH', 'LDH', 'liver', 'U/L'),
  ('Globulin', 'Globulines', 'GLOB', 'liver', 'g/dL'),
  ('Albumin/Globulin Ratio', 'Rapport albumine/globulines', 'AGRATIO', 'liver', null),
  ('PT / Prothrombin Time', 'Temps de prothrombine (TP)', 'PT', 'liver', 'sec'),
  ('INR', 'INR', 'INR', 'liver', null),

  -- Kidney / Renal — additions
  ('BUN/Creatinine Ratio', 'Rapport urée/créatinine', 'BUNCREATRATIO', 'kidney_renal', null),
  ('Sodium', 'Sodium', 'NA', 'kidney_renal', 'mmol/L'),
  ('Potassium', 'Potassium', 'K', 'kidney_renal', 'mmol/L'),
  ('Chloride', 'Chlorure', 'CL', 'kidney_renal', 'mmol/L'),
  ('CO2 / Bicarbonate', 'CO2 / Bicarbonate', 'CO2', 'kidney_renal', 'mmol/L'),
  ('Calcium', 'Calcium', 'CA', 'kidney_renal', 'mg/dL'),
  ('Phosphorus', 'Phosphore', 'PHOS', 'kidney_renal', 'mg/dL'),
  ('Magnesium', 'Magnésium', 'MG', 'kidney_renal', 'mg/dL'),
  ('Urinalysis', 'Analyse d''urine', 'UA', 'kidney_renal', null),
  ('Urine Albumin', 'Albumine urinaire', 'UALB', 'kidney_renal', 'mg/L'),
  ('Urine Creatinine', 'Créatinine urinaire', 'UCREAT', 'kidney_renal', 'mg/dL'),
  ('Urine Albumin/Creatinine Ratio', 'Rapport albumine/créatinine urinaire', 'UACR', 'kidney_renal', 'mg/g'),

  -- CBC / Blood — differential additions
  ('MCV', 'VGM (volume globulaire moyen)', 'MCV', 'blood_cbc', 'fL'),
  ('MCH', 'TCMH', 'MCH', 'blood_cbc', 'pg'),
  ('MCHC', 'CCMH', 'MCHC', 'blood_cbc', 'g/dL'),
  ('RDW', 'IDR (indice de distribution des globules rouges)', 'RDW', 'blood_cbc', '%'),
  ('Neutrophils', 'Neutrophiles', 'NEUT', 'blood_cbc', '%'),
  ('Lymphocytes', 'Lymphocytes', 'LYMPH', 'blood_cbc', '%'),
  ('Monocytes', 'Monocytes', 'MONO', 'blood_cbc', '%'),
  ('Eosinophils', 'Éosinophiles', 'EOS', 'blood_cbc', '%'),
  ('Basophils', 'Basophiles', 'BASO', 'blood_cbc', '%'),
  ('Absolute Neutrophils', 'Neutrophiles absolus', 'ANC', 'blood_cbc', 'x10^9/L'),
  ('Absolute Lymphocytes', 'Lymphocytes absolus', 'ALC', 'blood_cbc', 'x10^9/L'),
  ('Absolute Monocytes', 'Monocytes absolus', 'AMC', 'blood_cbc', 'x10^9/L'),
  ('Absolute Eosinophils', 'Éosinophiles absolus', 'AEC', 'blood_cbc', 'x10^9/L'),
  ('Absolute Basophils', 'Basophiles absolus', 'ABC', 'blood_cbc', 'x10^9/L'),

  -- Metabolic — additions
  ('Fasting Glucose', 'Glycémie à jeun', 'FASTGLU', 'metabolic', 'mg/dL'),
  ('Insulin', 'Insuline', 'INSULIN', 'metabolic', 'µIU/mL'),
  ('Non-HDL Cholesterol', 'Cholestérol non-HDL', 'NONHDL', 'metabolic', 'mg/dL'),

  -- Thyroid (new category)
  ('TSH', 'TSH', 'TSH', 'thyroid', 'µIU/mL'),
  ('Free T4', 'T4 libre', 'FT4', 'thyroid', 'ng/dL'),
  ('Free T3', 'T3 libre', 'FT3', 'thyroid', 'pg/mL'),
  ('Total T4', 'T4 totale', 'TT4', 'thyroid', 'µg/dL'),
  ('Total T3', 'T3 totale', 'TT3', 'thyroid', 'ng/dL'),

  -- Iron / Nutrition (new category)
  ('Ferritin', 'Ferritine', 'FERR', 'iron_nutrition', 'ng/mL'),
  ('Iron', 'Fer sérique', 'FE', 'iron_nutrition', 'µg/dL'),
  ('TIBC', 'Capacité totale de fixation du fer', 'TIBC', 'iron_nutrition', 'µg/dL'),
  ('Transferrin', 'Transferrine', 'TRF', 'iron_nutrition', 'mg/dL'),
  ('Transferrin Saturation', 'Saturation de la transferrine', 'TSAT', 'iron_nutrition', '%'),
  ('Vitamin B12', 'Vitamine B12', 'B12', 'iron_nutrition', 'pg/mL'),
  ('Folate', 'Folate', 'FOLATE', 'iron_nutrition', 'ng/mL'),
  ('Vitamin D', 'Vitamine D', 'VITD', 'iron_nutrition', 'ng/mL'),

  -- Inflammation / Immune (new category)
  ('CRP', 'CRP (protéine C-réactive)', 'CRP', 'inflammation_immune', 'mg/L'),
  ('ESR', 'VS (vitesse de sédimentation)', 'ESR', 'inflammation_immune', 'mm/h'),
  ('ANA', 'AAN (anticorps antinucléaires)', 'ANA', 'inflammation_immune', null),

  -- Pancreas (new category)
  ('Lipase', 'Lipase', 'LIPASE', 'pancreas', 'U/L'),
  ('Amylase', 'Amylase', 'AMYLASE', 'pancreas', 'U/L'),

  -- Cardiovascular (new category)
  ('Troponin', 'Troponine', 'TROP', 'cardiovascular', 'ng/mL'),
  ('BNP', 'BNP', 'BNP', 'cardiovascular', 'pg/mL'),
  ('NT-proBNP', 'NT-proBNP', 'NTPROBNP', 'cardiovascular', 'pg/mL')
) as v(name_en, name_fr, code, category, default_unit)
where not exists (
  select 1 from test_definitions existing
  where existing.code = v.code and existing.user_id is null
);

notify pgrst, 'reload schema';
