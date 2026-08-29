-- LifeOS Migration 0034: Finance core
--
-- Income and Expenses are the SAME table (`finance_transactions`,
-- distinguished by `type`) rather than two near-identical tables — an
-- Income "Source" and an Expense "Description" both map to
-- `description`. `business_id`/`project_id` are nullable FKs so a
-- transaction tagged to a business is the same row visible from both
-- Finance -> Expenses and Planning -> Business -> X -> Finances, never
-- duplicated (Section 17). Categories are plain text validated against
-- an allow-list at the zod/form layer, not a DB check constraint, so
-- "allow custom categories if appropriate" doesn't require a migration
-- later.

create table if not exists finance_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount numeric not null check (amount > 0),
  date date not null default current_date,
  category text not null,
  payment_method text,
  is_recurring boolean not null default false,
  business_id uuid references businesses(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table finance_transactions enable row level security;
create policy "finance_transactions_all_own" on finance_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists finance_transactions_user_id_idx on finance_transactions(user_id);
create index if not exists finance_transactions_date_idx on finance_transactions(date);
create index if not exists finance_transactions_business_id_idx on finance_transactions(business_id);
create index if not exists finance_transactions_project_id_idx on finance_transactions(project_id);

-- One row per category — "Spent" is computed live from
-- finance_transactions (this-month expense sum per category), never
-- stored/duplicated here (Section 23).
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_amount numeric not null check (monthly_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);
alter table budgets enable row level security;
create policy "budgets_all_own" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists budgets_user_id_idx on budgets(user_id);

notify pgrst, 'reload schema';
