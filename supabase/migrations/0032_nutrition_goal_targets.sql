-- LifeOS Migration 0032: Nutrition goal targets
--
-- Redesign Nutrition spec, Goals tab: optional user-set daily targets
-- (calorie/protein/carbs/fat), same nullable-override pattern already
-- used for hydration_target_ml (migration 0028) — null means "no goal
-- set," never an auto-computed or prescribed number.

alter table nutrition_preferences
  add column if not exists calorie_target numeric,
  add column if not exists protein_target_g numeric,
  add column if not exists carbs_target_g numeric,
  add column if not exists fat_target_g numeric;

notify pgrst, 'reload schema';
