-- LifeOS Migration 0035: Credit & Loans
--
-- Lives entirely inside Finance (Finance spec, Section 24: "must NOT be
-- a top-level sidebar item"). Every payoff/interest/utilization figure
-- shown in the UI is computed live from these stored fields via
-- src/lib/finance/amortization.ts — nothing derived is stored here.

create table if not exists credit_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric not null check (balance >= 0),
  credit_limit numeric not null check (credit_limit > 0),
  apr numeric not null check (apr >= 0),
  minimum_payment numeric check (minimum_payment >= 0),
  current_payment numeric check (current_payment >= 0),
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table credit_cards enable row level security;
create policy "credit_cards_all_own" on credit_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists credit_cards_user_id_idx on credit_cards(user_id);

create table if not exists loans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  original_amount numeric not null check (original_amount > 0),
  balance numeric not null check (balance >= 0),
  apr numeric not null check (apr >= 0),
  minimum_payment numeric check (minimum_payment >= 0),
  payment_frequency text check (payment_frequency in ('weekly', 'biweekly', 'monthly')),
  remaining_term_months integer check (remaining_term_months >= 0),
  next_payment_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table loans enable row level security;
create policy "loans_all_own" on loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists loans_user_id_idx on loans(user_id);

notify pgrst, 'reload schema';
