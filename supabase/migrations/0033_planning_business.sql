-- LifeOS Migration 0033: Planning & Business
--
-- Fills out the bare-bones Planning tables (projects/goals/tasks) added
-- in 0001_core.sql with the fields the Planning module actually needs,
-- and adds a new `businesses` table. Business is a Planning CONTEXT,
-- not a parallel system — projects/goals/tasks/notes/finance
-- transactions each get an optional `business_id` so the same row is
-- visible from both Planning's flat lists and a business's own detail
-- view, never duplicated.
--
-- projects/goals/tasks have zero rows today (Planning was never live —
-- see 0001_core.sql's comment history), so redefining projects.status's
-- check constraint is a safe, non-breaking change here, not a real
-- migration of existing data.

alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('idea', 'planning', 'active', 'completed', 'archived'));
alter table projects alter column status set default 'idea';

alter table projects
  add column if not exists category text,
  add column if not exists notes text;

-- Goals had zero rows too (Planning was never live), so redefining the
-- status enum to match the spec's Not Started/In Progress/Completed/
-- Archived is likewise a safe redefinition, not a data migration.
alter table goals drop constraint if exists goals_status_check;
alter table goals add constraint goals_status_check
  check (status in ('not_started', 'in_progress', 'completed', 'archived'));
alter table goals alter column status set default 'not_started';

alter table goals
  add column if not exists category text,
  add column if not exists progress numeric not null default 0 check (progress between 0 and 100),
  add column if not exists project_id uuid references projects(id) on delete set null;

alter table tasks
  add column if not exists priority text check (priority in ('low', 'medium', 'high')),
  add column if not exists goal_id uuid references goals(id) on delete set null,
  add column if not exists notes text;

create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text,
  status text not null default 'idea' check (status in ('idea', 'planning', 'active', 'paused', 'completed', 'archived')),
  start_date date,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table businesses enable row level security;
create policy "businesses_all_own" on businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists businesses_user_id_idx on businesses(user_id);

-- business_id added after `businesses` exists so the FK can resolve.
alter table projects add column if not exists business_id uuid references businesses(id) on delete set null;
alter table goals add column if not exists business_id uuid references businesses(id) on delete set null;
alter table tasks add column if not exists business_id uuid references businesses(id) on delete set null;

create index if not exists projects_business_id_idx on projects(business_id);
create index if not exists goals_business_id_idx on goals(business_id);
create index if not exists goals_project_id_idx on goals(project_id);
create index if not exists tasks_business_id_idx on tasks(business_id);
create index if not exists tasks_goal_id_idx on tasks(goal_id);

-- Notes: pinning + the two new optional relations. related_domain
-- (already existed) doubles as Notes' "Category" field
-- (Health/Planning/Finance/Business/Personal/General) — no new column
-- needed for that.
alter table notes
  add column if not exists pinned boolean not null default false,
  add column if not exists related_goal_id uuid references goals(id) on delete set null,
  add column if not exists related_business_id uuid references businesses(id) on delete set null;

create index if not exists notes_related_goal_id_idx on notes(related_goal_id);
create index if not exists notes_related_business_id_idx on notes(related_business_id);

notify pgrst, 'reload schema';
