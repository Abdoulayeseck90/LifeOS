-- LifeOS Migration 0041: Faith / Dua
--
-- Section 33: never fabricate Qur'an/Hadith text, Arabic supplications,
-- or citations. This migration creates the full schema with ZERO seeded
-- rows — the built-in library starts genuinely empty and is populated
-- later from a verified source, never from generated content.
--
-- `duas` is the first table in this app with no `user_id` column — a
-- built-in row isn't owned by any single user, it's shared library
-- content. `created_by` (nullable) identifies the author of a personal
-- Dua only; it's null for every built-in row.

create table if not exists duas (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  arabic_text text,
  transliteration text,
  translation text,
  meaning text,
  -- Union of Section 3's built-in time/context taxonomy AND Section 8's
  -- personal-Dua organizational categories — both share this one column
  -- (built-in and personal Duas are rows in the same table), so the
  -- constraint has to accept whichever list a given row actually came
  -- from. 'work', 'business', 'finance', 'marriage', 'goals' come only
  -- from Section 8 (personal); everything else is Section 3's list.
  category text not null check (category in (
    'morning', 'evening', 'before_sleep', 'after_waking', 'before_eating',
    'after_eating', 'leaving_home', 'entering_home', 'travel', 'protection',
    'forgiveness', 'guidance', 'gratitude', 'rizq', 'family', 'health',
    'difficulty_stress', 'personal', 'other', 'work', 'business', 'finance',
    'marriage', 'goals'
  )),
  recommended_time text,
  frequency text,
  source_name text,
  source_reference text,
  source_type text check (source_type in ('quran', 'hadith', 'adhkar_collection', 'other')),
  source_url text,
  verification_status text not null default 'needs_verification' check (
    verification_status in ('verified', 'needs_verification')
  ),
  is_builtin boolean not null default false,
  created_by uuid references auth.users(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A row is either shared built-in content (no owner) or a personal Dua
  -- (owned, never built-in) — never both, never neither.
  constraint duas_builtin_ownership_check check (
    (is_builtin = true and created_by is null) or (is_builtin = false and created_by is not null)
  )
);
alter table duas enable row level security;

-- Split RLS (unlike every other table's single "own rows only" policy):
-- every authenticated user reads the shared built-in library plus only
-- their own personal Duas (Section 27), but can only ever write rows
-- that are their own AND not built-in (Section 24: ordinary users can
-- never create/edit/delete verified built-in content — enforced here,
-- not just hidden client-side).
create policy "duas_select" on duas
  for select using (is_builtin = true or created_by = auth.uid());
create policy "duas_insert_own_personal" on duas
  for insert with check (is_builtin = false and created_by = auth.uid());
create policy "duas_update_own_personal" on duas
  for update using (is_builtin = false and created_by = auth.uid())
  with check (is_builtin = false and created_by = auth.uid());
create policy "duas_delete_own_personal" on duas
  for delete using (is_builtin = false and created_by = auth.uid());

create index if not exists duas_category_idx on duas(category);
create index if not exists duas_is_builtin_idx on duas(is_builtin);
create index if not exists duas_created_by_idx on duas(created_by);

-- Section 9: which Duas are in the user's personal routine, and under
-- which named time block. Never duplicates the Dua itself.
create table if not exists user_dua_routines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dua_id uuid not null references duas(id) on delete cascade,
  schedule_type text not null check (schedule_type in ('morning', 'evening', 'before_sleep', 'daily', 'custom')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table user_dua_routines enable row level security;
create policy "user_dua_routines_all_own" on user_dua_routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists user_dua_routines_user_id_idx on user_dua_routines(user_id);
create index if not exists user_dua_routines_dua_id_idx on user_dua_routines(dua_id);

-- Section 14: one reminder time PER NAMED BLOCK, not per individual Dua
-- — every example in the spec shows exactly one time for "Morning",
-- regardless of how many Duas are scheduled inside it.
create table if not exists dua_reminder_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_type text not null check (schedule_type in ('morning', 'evening', 'before_sleep')),
  enabled boolean not null default false,
  time_of_day time not null default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, schedule_type)
);
alter table dua_reminder_settings enable row level security;
create policy "dua_reminder_settings_all_own" on dua_reminder_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Section 26: idempotent daily completion. The unique constraint is what
-- makes "Mark Complete" safe to call repeatedly without ever creating a
-- duplicate — the API layer upserts on conflict, or deletes the row to
-- "uncomplete" (Section 10's checklist implies a real toggle, not a
-- one-way action). Nothing here is ever bulk-deleted by a "daily reset"
-- — today's and yesterday's checklists are just today's/yesterday's
-- query against this table (Section 11).
create table if not exists dua_completions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dua_id uuid not null references duas(id) on delete cascade,
  routine_id uuid not null references user_dua_routines(id) on delete cascade,
  completed_date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, routine_id, completed_date)
);
alter table dua_completions enable row level security;
create policy "dua_completions_all_own" on dua_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists dua_completions_user_id_date_idx on dua_completions(user_id, completed_date);

-- Sections 19+20 merged: a user's private favorite flag and private
-- notes for a Dua are both "this user's private overlay on a shared
-- piece of content" — one row instead of two near-duplicate join tables.
create table if not exists dua_user_data (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dua_id uuid not null references duas(id) on delete cascade,
  favorited boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dua_id)
);
alter table dua_user_data enable row level security;
create policy "dua_user_data_all_own" on dua_user_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
