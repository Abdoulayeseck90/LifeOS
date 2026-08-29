-- LifeOS Migration 0025: Expand Nutrition into a Practical Health &
-- Meal Planning System — tracking fields
--
-- Spec Section 24/"before implementing, inspect the existing Nutrition
-- database/schema and reuse existing structures": meal_log_entries
-- (0002_health.sql) already exists, described at the time as "V1 scope
-- trimmed... no macro tracking table in V1; that is Phase 6." This is
-- that phase — extending the SAME table with optional structured
-- fields rather than a parallel one, per Spec Section 15: "Do not
-- require every field. The user should be able to quickly log a
-- simple meal." Every column is nullable; `description`/`notes`/
-- `meal_type`/`date` and all existing rows are untouched.
--
-- sugar_g is deliberately just "sugar" as the user reads it off a
-- label or estimates — LifeOS has no food-composition database to
-- algorithmically separate "free sugar" from naturally-occurring fruit
-- sugar (Spec Section 4's distinction), so the UI explains the
-- difference in words rather than the schema pretending to compute it.
-- sodium_mg matches how nutrition labels actually state it; salt-gram
-- equivalents are derived for display (sodium_mg * 2.5 / 1000), not
-- stored separately, per Spec Section 3.
alter table meal_log_entries add column if not exists calories numeric;
alter table meal_log_entries add column if not exists protein_g numeric;
alter table meal_log_entries add column if not exists carbs_g numeric;
alter table meal_log_entries add column if not exists fat_g numeric;
alter table meal_log_entries add column if not exists fiber_g numeric;
alter table meal_log_entries add column if not exists sugar_g numeric;
alter table meal_log_entries add column if not exists sodium_mg numeric;
-- Spec Section 6: "allow grams, portions, servings" — both stored so a
-- user can log in whichever unit they actually know, never forced to
-- convert or weigh food.
alter table meal_log_entries add column if not exists fruit_veg_g numeric;
alter table meal_log_entries add column if not exists fruit_veg_portions numeric;

notify pgrst, 'reload schema';
