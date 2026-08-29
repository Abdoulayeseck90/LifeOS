-- LifeOS Migration 0023: Expand Lab Test Selection & Custom Test Support
--
-- Spec Section 14: "extend the existing model only where necessary" —
-- test_definitions (0002_health.sql) already has the bilingual name/
-- code/category/default_unit/description/active shape; this migration
-- only adds what's genuinely missing: the global-vs-custom distinction
-- (Section 13) and 5 new categories (Sections 7-11).

-- Global reference tests (curated, shared) have user_id null; a
-- custom test a user types into "+ Add other test" has user_id set to
-- them and is_custom = true. A custom test is NEVER promoted to
-- global automatically (Section 13's explicit safety rule).
alter table test_definitions add column if not exists is_custom boolean not null default false;
alter table test_definitions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table test_definitions add constraint test_definitions_custom_requires_user
  check (is_custom = false or user_id is not null);

-- Expand the category vocabulary (Sections 7-11) without touching any
-- row currently using the original 6 values. Looked up and dropped
-- dynamically rather than by a guessed constraint name.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'test_definitions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table test_definitions drop constraint %I', con.conname);
  end loop;
end $$;

alter table test_definitions add constraint test_definitions_category_check
  check (category in (
    'hepatitis_b', 'liver', 'kidney_renal', 'blood_cbc', 'metabolic',
    'thyroid', 'iron_nutrition', 'inflammation_immune', 'pancreas', 'cardiovascular',
    'other'
  ));

-- RLS: every authenticated user still reads every global test (Spec
-- Section 11, unchanged) plus now their OWN custom tests too; nobody
-- reads another user's custom tests. Writing is only ever a user
-- creating their own custom row — global rows stay migration/seed-only.
drop policy if exists "test_definitions_read_all" on test_definitions;
create policy "test_definitions_select_global_or_own" on test_definitions
  for select using (user_id is null or auth.uid() = user_id);
create policy "test_definitions_insert_own_custom" on test_definitions
  for insert with check (auth.uid() = user_id and is_custom = true);

create index if not exists test_definitions_user_id_idx on test_definitions(user_id) where user_id is not null;

-- Lets the seed migration (0024) use ON CONFLICT for idempotency
-- without constraining custom tests, where two different users (or
-- one user twice) reusing the same code string is harmless and
-- shouldn't be blocked.
create unique index if not exists test_definitions_global_code_unique on test_definitions(code) where user_id is null and code is not null;

notify pgrst, 'reload schema';
