-- LifeOS Migration 0001: Core foundation
-- Spec Section 6 (LifeOS Core), Section 6.2 (Tenancy & Threat Model),
-- Section 6.3 (Localization), Section 28 (Database Design Principles)

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Profiles (Spec 6.2, 6.3): one row per auth user. preferred_language
-- drives UI locale (next-intl); two_factor_enabled is surfaced in
-- Settings per the Section 6.2 threat-model recommendation.
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'fr')),
  two_factor_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Every RLS policy in this schema follows the same shape:
-- auth.uid() = user_id. Spec 6.2 calls out a full per-table audit of
-- this exact check as a release gate before a second real account
-- is ever onboarded — keep this pattern uniform so that audit is easy.
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = user_id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------------------------------------------------------------------
-- Projects (Spec 6.4): Core-level, referenceable by any domain.
-- ---------------------------------------------------------------------
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'on_hold', 'completed', 'archived')),
  priority text check (priority in ('low', 'medium', 'high')),
  start_date date,
  target_date date,
  completed_date date,
  domain text check (domain in ('health', 'planning', 'finance', 'business', 'travel', 'assets')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;
create policy "projects_all_own" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index projects_user_id_idx on projects(user_id);
create index projects_domain_idx on projects(domain);

-- ---------------------------------------------------------------------
-- Documents (Spec 13, 28): private storage metadata. The actual file
-- lives in Supabase Storage (see 0004_storage.sql); this row tracks
-- provenance and links back to whatever record it supports.
-- ---------------------------------------------------------------------
create table documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  category text,
  storage_path text not null,
  mime_type text not null,
  file_size integer not null,
  document_date date,
  provider text,
  source text,
  tags text[] not null default '{}',
  related_condition_id uuid,
  related_appointment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table documents enable row level security;
create policy "documents_all_own" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index documents_user_id_idx on documents(user_id);

-- ---------------------------------------------------------------------
-- Tasks, Events, Goals, Notes, Notifications (Spec 6.1)
-- ---------------------------------------------------------------------
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  due_date date,
  project_id uuid references projects(id) on delete set null,
  domain text,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tasks enable row level security;
create policy "tasks_all_own" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index tasks_user_id_idx on tasks(user_id);
create index tasks_due_date_idx on tasks(due_date);

create table events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table events enable row level security;
create policy "events_all_own" on events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index events_user_id_idx on events(user_id);
create index events_starts_at_idx on events(starts_at);

create table goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'achieved', 'abandoned')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table goals enable row level security;
create policy "goals_all_own" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index goals_user_id_idx on goals(user_id);

create table notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null default '',
  folder text,
  tags text[] not null default '{}',
  related_domain text,
  related_project_id uuid references projects(id) on delete set null,
  related_appointment_id uuid,
  related_condition_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table notes enable row level security;
create policy "notes_all_own" on notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index notes_user_id_idx on notes(user_id);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  body text,
  read boolean not null default false,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "notifications_all_own" on notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index notifications_user_id_idx on notifications(user_id);
