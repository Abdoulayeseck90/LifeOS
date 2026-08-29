-- LifeOS seed data — Spec Section 11.1 initial test categories.
-- Bilingual (EN/FR) per Spec Section 6.3. Run after migrations:
--   supabase db execute -f supabase/seed.sql

insert into test_definitions (name_en, name_fr, code, category, default_unit) values
  -- Hepatitis B / virology
  ('HBV DNA', 'ADN du VHB', 'HBV-DNA', 'hepatitis_b', 'IU/mL'),
  ('HBsAg', 'AgHBs', 'HBSAG', 'hepatitis_b', null),
  ('HBeAg', 'AgHBe', 'HBEAG', 'hepatitis_b', null),
  ('Anti-HBe', 'Anti-HBe', 'ANTIHBE', 'hepatitis_b', null),
  ('Anti-HBs', 'Anti-HBs', 'ANTIHBS', 'hepatitis_b', 'mIU/mL'),
  ('Anti-HBc', 'Anti-HBc', 'ANTIHBC', 'hepatitis_b', null),

  -- Liver
  ('ALT', 'ALAT', 'ALT', 'liver', 'U/L'),
  ('AST', 'ASAT', 'AST', 'liver', 'U/L'),
  ('ALP', 'PAL', 'ALP', 'liver', 'U/L'),
  ('Bilirubin', 'Bilirubine', 'TBIL', 'liver', 'mg/dL'),
  ('Albumin', 'Albumine', 'ALB', 'liver', 'g/dL'),
  ('Total protein', 'Protéines totales', 'TP', 'liver', 'g/dL'),
  ('GGT', 'GGT', 'GGT', 'liver', 'U/L'),

  -- Kidney / renal
  ('Creatinine', 'Créatinine', 'CREAT', 'kidney_renal', 'mg/dL'),
  ('eGFR', 'DFGe', 'EGFR', 'kidney_renal', 'mL/min/1.73m2'),
  ('BUN', 'Azote uréique', 'BUN', 'kidney_renal', 'mg/dL'),
  ('Urine protein', 'Protéinurie', 'UPROT', 'kidney_renal', 'mg/dL'),

  -- Blood / CBC
  ('WBC', 'Leucocytes', 'WBC', 'blood_cbc', 'x10^9/L'),
  ('RBC', 'Érythrocytes', 'RBC', 'blood_cbc', 'x10^12/L'),
  ('Hemoglobin', 'Hémoglobine', 'HGB', 'blood_cbc', 'g/dL'),
  ('Hematocrit', 'Hématocrite', 'HCT', 'blood_cbc', '%'),
  ('Platelets', 'Plaquettes', 'PLT', 'blood_cbc', 'x10^9/L'),

  -- Metabolic
  ('Glucose', 'Glycémie', 'GLU', 'metabolic', 'mg/dL'),
  ('HbA1c', 'HbA1c', 'HBA1C', 'metabolic', '%'),
  ('Total cholesterol', 'Cholestérol total', 'TCHOL', 'metabolic', 'mg/dL'),
  ('LDL', 'LDL', 'LDL', 'metabolic', 'mg/dL'),
  ('HDL', 'HDL', 'HDL', 'metabolic', 'mg/dL'),
  ('Triglycerides', 'Triglycérides', 'TRIG', 'metabolic', 'mg/dL')
on conflict do nothing;
