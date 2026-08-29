-- LifeOS Migration 0029: Universal Exercise & Activity Library
--
-- Exercise & Fitness is deliberately NOT country/culture-specific
-- (Section 8/10) — every seeded activity below is commonly accessible
-- across different countries and environments, and no country's
-- sports are hard-coded as the default. Optional cultural
-- personalization (Section 11) lives entirely in
-- exercise_preferences.custom_activities — free text the user adds on
-- top of this universal library; it never replaces or narrows it.
--
-- `activities` is shared/curated global content, same shape as
-- `meals` (0026) and `test_definitions` before custom tests: readable
-- by any authenticated user, writable only via migration/seed.
-- categories is an array (not a single category) because a few
-- activities genuinely span more than one section in the spec's own
-- list (e.g. Walking appears under both Cardio and Daily Activity).
-- equipment_needed/environments/tags drive the deterministic
-- environment- and equipment-aware suggestions in
-- src/lib/health/activity-library.ts (Section 9) — 'none' in
-- equipment_needed means the activity requires no equipment at all.

create table activities (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_fr text not null,
  categories text[] not null check (
    categories <@ array['cardio', 'sports', 'strength', 'mobility_flexibility', 'daily_activity']
  ),
  equipment_needed text[] not null default '{none}' check (
    equipment_needed <@ array['none', 'home_equipment', 'resistance_bands', 'dumbbells', 'kettlebells', 'full_gym', 'other']
  ),
  environments text[] not null default '{anywhere}' check (
    environments <@ array['home', 'outdoor', 'gym', 'anywhere']
  ),
  -- Supplementary flags used by Section 9's accessibility mapping:
  -- low_impact, small_space_friendly, limited_mobility_friendly.
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table activities enable row level security;
create policy "activities_read_all" on activities
  for select using (auth.role() = 'authenticated');
create index activities_categories_idx on activities using gin(categories);

create table exercise_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  equipment text[] not null default '{}' check (
    equipment <@ array['none', 'home_equipment', 'resistance_bands', 'dumbbells', 'kettlebells', 'full_gym', 'other']
  ),
  activity_preferences text[] not null default '{}' check (
    activity_preferences <@ array['walking', 'running', 'cycling', 'swimming', 'gym', 'home_workout', 'sports', 'yoga_pilates', 'mobility', 'other']
  ),
  fitness_level text check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  available_time text check (available_time in ('quick', 'moderate', 'extended')),
  -- Drives Section 9's environment-based suggestions; not the same as
  -- `environments` above (that's per-activity, this is the user's own
  -- typical context).
  environment text check (environment in ('home_no_equipment', 'outdoor', 'gym', 'limited_mobility', 'small_space', 'flexible')),
  -- Section 11: optional cultural/regional personalization (e.g. a
  -- sport common in the user's area) layered on top of the universal
  -- library — never required, never changes the default experience.
  custom_activities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table exercise_preferences enable row level security;
create policy "exercise_preferences_all_own" on exercise_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into activities (name_en, name_fr, categories, equipment_needed, environments, tags)
select v.name_en, v.name_fr, v.categories, v.equipment_needed, v.environments, v.tags
from (
  values
  -- Cardio
  ('Walking', 'Marche', array['cardio', 'daily_activity'], array['none'], array['outdoor', 'anywhere'], array['low_impact']),
  ('Brisk Walking', 'Marche rapide', array['cardio'], array['none'], array['outdoor', 'anywhere'], array['low_impact']),
  ('Running', 'Course à pied', array['cardio'], array['none'], array['outdoor', 'anywhere'], array[]::text[]),
  ('Jogging', 'Jogging', array['cardio'], array['none'], array['outdoor', 'anywhere'], array[]::text[]),
  ('Cycling', 'Vélo', array['cardio'], array['none', 'other'], array['outdoor'], array['low_impact']),
  ('Stationary Cycling', 'Vélo d''appartement', array['cardio'], array['home_equipment', 'full_gym'], array['home', 'gym'], array['low_impact']),
  ('Swimming', 'Natation', array['cardio'], array['other'], array['gym'], array['low_impact']),
  ('Rowing', 'Aviron (rameur)', array['cardio'], array['home_equipment', 'full_gym'], array['home', 'gym'], array[]::text[]),
  ('Elliptical', 'Vélo elliptique', array['cardio'], array['home_equipment', 'full_gym'], array['home', 'gym'], array['low_impact']),
  ('Stair Climbing', 'Montée d''escaliers', array['cardio', 'daily_activity'], array['none'], array['anywhere'], array[]::text[]),
  ('Hiking', 'Randonnée', array['cardio'], array['none'], array['outdoor'], array[]::text[]),
  ('Dancing', 'Danse', array['cardio'], array['none'], array['home', 'anywhere'], array['small_space_friendly']),
  -- Sports
  ('Football / Soccer', 'Football', array['sports'], array['none'], array['outdoor'], array[]::text[]),
  ('Basketball', 'Basketball', array['sports'], array['none'], array['outdoor', 'gym'], array[]::text[]),
  ('Tennis', 'Tennis', array['sports'], array['other'], array['outdoor', 'gym'], array[]::text[]),
  ('Volleyball', 'Volleyball', array['sports'], array['none'], array['outdoor', 'gym'], array[]::text[]),
  ('Badminton', 'Badminton', array['sports'], array['other'], array['outdoor', 'gym'], array[]::text[]),
  ('Other Sports', 'Autres sports', array['sports'], array['other'], array['outdoor', 'gym', 'anywhere'], array[]::text[]),
  -- Strength
  ('Bodyweight Training', 'Entraînement au poids du corps', array['strength'], array['none'], array['home', 'anywhere'], array['small_space_friendly']),
  ('Resistance Bands', 'Bandes de résistance', array['strength'], array['resistance_bands'], array['home', 'anywhere'], array['small_space_friendly']),
  ('Dumbbells', 'Haltères', array['strength'], array['dumbbells'], array['home', 'gym'], array[]::text[]),
  ('Barbells', 'Barres de musculation', array['strength'], array['full_gym'], array['gym'], array[]::text[]),
  ('Machines', 'Machines de musculation', array['strength'], array['full_gym'], array['gym'], array[]::text[]),
  ('Kettlebells', 'Kettlebells', array['strength'], array['kettlebells'], array['home', 'gym'], array[]::text[]),
  ('Home Workouts', 'Entraînements à domicile', array['strength'], array['none', 'home_equipment'], array['home'], array['small_space_friendly']),
  ('Gym Workouts', 'Entraînements en salle', array['strength'], array['full_gym'], array['gym'], array[]::text[]),
  -- Mobility / Flexibility
  ('Stretching', 'Étirements', array['mobility_flexibility'], array['none'], array['home', 'anywhere'], array['low_impact', 'small_space_friendly', 'limited_mobility_friendly']),
  ('Yoga', 'Yoga', array['mobility_flexibility'], array['none'], array['home', 'anywhere'], array['low_impact', 'small_space_friendly', 'limited_mobility_friendly']),
  ('Pilates', 'Pilates', array['mobility_flexibility'], array['none', 'home_equipment'], array['home', 'gym'], array['low_impact', 'small_space_friendly']),
  ('Mobility Routines', 'Routines de mobilité', array['mobility_flexibility'], array['none'], array['home', 'anywhere'], array['low_impact', 'small_space_friendly', 'limited_mobility_friendly']),
  ('Balance Exercises', 'Exercices d''équilibre', array['mobility_flexibility'], array['none'], array['home', 'anywhere'], array['low_impact', 'small_space_friendly', 'limited_mobility_friendly']),
  -- Daily Activity
  ('Taking Stairs', 'Prendre les escaliers', array['daily_activity'], array['none'], array['anywhere'], array[]::text[]),
  ('Household Activity', 'Activité ménagère', array['daily_activity'], array['none'], array['home'], array['low_impact']),
  ('Active Commuting', 'Déplacement actif', array['daily_activity'], array['none'], array['outdoor', 'anywhere'], array[]::text[]),
  ('Recreational Activities', 'Activités récréatives', array['daily_activity'], array['none', 'other'], array['outdoor', 'anywhere'], array[]::text[])
) as v(name_en, name_fr, categories, equipment_needed, environments, tags)
where not exists (
  select 1 from activities existing where existing.name_en = v.name_en
);

notify pgrst, 'reload schema';
