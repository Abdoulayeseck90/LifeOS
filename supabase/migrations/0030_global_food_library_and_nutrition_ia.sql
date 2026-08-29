-- LifeOS Migration 0030: Global Food Library & Nutrition Reorganization
--
-- Redesign Nutrition spec, Section 17: "Do not build the food database
-- around only Senegal or the United States... Do not hard-code cuisine
-- options into individual React components." This migration:
--
--   1. Adds `foods` — individual food items (distinct from `meals`,
--      which are composed dishes), global/curated content, same
--      read-all-authenticated pattern as `meals`. `cuisine` and
--      `category` are plain text (no CHECK constraint) so new
--      cuisines/categories never require a migration — the known/
--      displayed set lives in one shared TS module
--      (src/lib/health/cuisines.ts), not scattered across components.
--      `classification` uses the spec's Section 6 four-tier system
--      (prioritize/moderation/limit/info) — deliberately NOT the old
--      meals.rating vocabulary (best_choice/good_choice/moderation/
--      consider_modifying), which stays unchanged on `meals` to avoid
--      touching already-seeded data; the UI normalizes both through
--      one shared badge component (src/lib/health/classification.ts).
--
--   2. Widens `meals.cuisine` from a 4-value CHECK-constrained enum to
--      plain text — existing rows (all 'senegalese_west_african')
--      are untouched, but new cuisines (American, Mexican, etc.) no
--      longer require a schema change.
--
--   3. Extends `nutrition_preferences` for multi-cuisine
--      personalization (Section 16: "Cuisine preferences must allow
--      MULTIPLE selections") and country/region + favorite foods.
--      The old single-value `cuisine`/`goal` columns are left in place
--      untouched (not dropped) — safest option for a health app's
--      schema, per the spec's own Section 23 ("do not remove existing
--      data unless truly redundant"); the new UI simply stops reading
--      them in favor of the new array columns.

create table if not exists foods (
  id uuid primary key default uuid_generate_v4(),
  name_en text not null,
  name_fr text not null,
  -- Extra search terms not already covered by name_en/name_fr (Section
  -- 18) — e.g. regional synonyms. Usually empty; name_en/name_fr alone
  -- already satisfy most of the spec's own search examples ("arachide"
  -- matches via name_fr = 'Arachide').
  common_names text[] not null default '{}',
  cuisine text not null,
  country_region text,
  category text not null check (
    category in ('proteins', 'whole_grains', 'vegetables', 'fruits', 'nuts_seeds', 'legumes', 'other')
  ),
  serving_size_en text,
  serving_size_fr text,
  -- Estimates, never claimed as lab-measured (same disclosure as
  -- meals.calories_kcal etc. — Section 24 of the prior nutrition spec).
  calories_kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  added_sugar_g numeric,
  sodium_mg numeric,
  saturated_fat_g numeric,
  preparation_method_en text,
  preparation_method_fr text,
  -- Free-form tags (e.g. 'high_fiber', 'high_sodium', 'fried') used by
  -- the Food & Meals "Nutrition Goal" filter and classification
  -- reasoning — extensible without a migration, same rationale as
  -- meals.tags.
  health_tags text[] not null default '{}',
  classification text not null check (classification in ('prioritize', 'moderation', 'limit', 'info')),
  classification_reason_en text,
  classification_reason_fr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table foods enable row level security;
drop policy if exists "foods_read_all" on foods;
create policy "foods_read_all" on foods
  for select using (auth.role() = 'authenticated');
create index if not exists foods_cuisine_idx on foods(cuisine);
create index if not exists foods_category_idx on foods(category);
create index if not exists foods_classification_idx on foods(classification);

-- Widen meals.cuisine: drop the old 4-value CHECK, keep the column and
-- all existing rows exactly as they are. Looked up and dropped
-- dynamically rather than by a guessed constraint name (same pattern
-- as migration 0022 — Postgres auto-names differ by version/history).
-- Guarded with to_regclass so this migration doesn't hard-fail (and
-- roll back the `foods` table just created above, in the same
-- transaction) if `meals` doesn't exist yet in this database — run
-- migration 0026 first if that's the case.
do $$
declare
  con record;
begin
  if to_regclass('public.meals') is not null then
    for con in
      select conname from pg_constraint
      where conrelid = 'meals'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%cuisine%'
    loop
      execute format('alter table meals drop constraint %I', con.conname);
    end loop;
  end if;
end $$;

do $$
begin
  if to_regclass('public.nutrition_preferences') is not null then
    alter table nutrition_preferences
      add column if not exists cuisine_preferences text[] not null default '{}',
      add column if not exists country_region text,
      add column if not exists favorite_foods text[] not null default '{}',
      add column if not exists goals text[] not null default '{}';

    -- Backfill the new multi-select goals[] from the old single goal
    -- column so existing preferences aren't silently lost, mapped onto
    -- the spec's new goal vocabulary (Section 14).
    update nutrition_preferences
    set goals = array[
      case goal
        when 'balanced_eating' then 'general_healthy_eating'
        when 'increase_fiber' then 'increase_fiber'
        when 'reduce_sodium' then 'reduce_sodium'
        when 'reduce_free_sugar' then 'reduce_added_sugar'
        when 'increase_vegetables' then 'increase_vegetables'
        when 'maintain_weight' then 'weight_management'
        when 'gain_weight' then 'weight_management'
        when 'lose_weight' then 'weight_management'
      end
    ]
    where goal is not null and goals = '{}';

    -- Backfill cuisine_preferences[] from the old single cuisine column.
    update nutrition_preferences
    set cuisine_preferences = array[cuisine]
    where cuisine is not null and cuisine_preferences = '{}';
  end if;
end $$;

notify pgrst, 'reload schema';
