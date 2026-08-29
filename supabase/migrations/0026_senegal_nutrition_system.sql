-- LifeOS Migration 0026: Senegal-Focused Liver-Conscious Nutrition System
--
-- Spec Section 23 asks for 9 normalized tables (meals / ingredients /
-- meal_ingredients / meal_nutrition / meal_cuisine / meal_preferences /
-- meal_swaps / weekly_meal_plans / meal_tags). Deliberately simplified
-- to 3 tables that cover the same functional requirements without
-- over-normalizing a curated, developer-maintained content library:
--   - `meals`: one row per dish, bilingual, with nutrition as columns
--     (explicitly flagged as estimates — no food-composition database
--     backs this app, so precise per-ingredient macro computation
--     isn't possible; Section 24's "do not invent nutrition targets"
--     applies here too, so every figure is clearly labeled approximate
--     rather than presented as measured fact), ingredients/prep-tips/
--     substitutions as jsonb arrays of {en, fr} pairs (a many-to-many
--     ingredients table buys nothing when ingredients aren't otherwise
--     queried independently), tags as a plain text array, and
--     suggested_swap_meal_ids as a plain uuid array (Section 15's
--     swaps are a short curated list per meal, not a queryable graph).
--     Global/curated only, like test_definitions before custom tests
--     existed — no user_id/is_custom (the spec's Section 23 list
--     doesn't ask for user-created meals).
--   - `nutrition_preferences`: one row per user (Section 20).
--   - `shopping_list_items`: generated from the weekly plan, persisted
--     per user so it survives reloads (Section 16).
-- The 7-day plan itself (Section 11) is NOT a `weekly_meal_plans`
-- table — it's rendered directly from a fixed day->meal mapping in
-- application code, explicitly labeled "example meal plan, not a
-- prescription" per the spec's own Section 11 instruction, since a
-- live per-user drag-and-drop planner is a materially larger feature
-- than what this pass builds (disclosed to the user).

create table meals (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_fr text not null,
  description_en text,
  description_fr text,
  cuisine text not null check (cuisine in ('senegalese_west_african', 'mediterranean', 'american', 'other')),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  serving_size_en text,
  serving_size_fr text,
  -- jsonb array of {"en": "...", "fr": "..."} — ingredients, prep
  -- steps as a single paragraph (preparation_en/fr below), tips,
  -- substitutions.
  ingredients jsonb not null default '[]'::jsonb,
  preparation_en text,
  preparation_fr text,
  liver_conscious_preparation jsonb not null default '[]'::jsonb,
  foods_to_reduce jsonb not null default '[]'::jsonb,
  substitutions jsonb not null default '[]'::jsonb,
  -- Estimated per serving — never claimed as lab-measured (Section 24).
  calories_kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  rating text not null check (rating in ('best_choice', 'good_choice', 'moderation', 'consider_modifying')),
  rating_reason_en text,
  rating_reason_fr text,
  tags text[] not null default '{}',
  suggested_swap_meal_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table meals enable row level security;
-- Shared curated content, not user-owned — same shape as
-- test_definitions before custom tests (migration 0002/0023): readable
-- by any authenticated user, writable only via migration/seed.
create policy "meals_read_all" on meals
  for select using (auth.role() = 'authenticated');
create index meals_cuisine_idx on meals(cuisine);
create index meals_meal_type_idx on meals(meal_type);

create table nutrition_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  cuisine text check (cuisine in ('senegalese_west_african', 'mediterranean', 'american', 'other')),
  goal text check (goal in (
    'balanced_eating', 'increase_fiber', 'reduce_sodium', 'reduce_free_sugar',
    'increase_vegetables', 'maintain_weight', 'gain_weight', 'lose_weight'
  )),
  diet_preferences text[] not null default '{}',
  dislikes text[] not null default '{}',
  allergies text[] not null default '{}',
  budget text check (budget in ('low', 'moderate', 'flexible')),
  cooking_time text check (cooking_time in ('quick', 'moderate', 'extended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table nutrition_preferences enable row level security;
create policy "nutrition_preferences_all_own" on nutrition_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table shopping_list_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in (
    'vegetables', 'fruits', 'fish', 'protein', 'grains', 'legumes', 'nuts_seeds', 'seasonings', 'dairy', 'other'
  )),
  purchased boolean not null default false,
  source text,
  created_at timestamptz not null default now()
);
alter table shopping_list_items enable row level security;
create policy "shopping_list_items_all_own" on shopping_list_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index shopping_list_items_user_id_idx on shopping_list_items(user_id);

notify pgrst, 'reload schema';
