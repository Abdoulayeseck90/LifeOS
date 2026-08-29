-- LifeOS Migration 0038: Subscriptions
--
-- A Subscription is a recurring service definition (Netflix, a SaaS
-- tool, etc.) — distinct from the actual charges it produces. Each
-- billing cycle, "Record Charge" creates ONE finance_transactions row
-- (subscription_id below) and advances next_billing_date; unlike Bills
-- there is no single "linked_transaction_id" to guard against
-- duplication, because a subscription legitimately produces a new,
-- separate Expense every cycle (Section 29: Subscription -> Recurring
-- Charge -> Expense). Finance Overview must sum only those Expense rows
-- for a subscription's "spent" total — the subscription's own `amount`
-- field is its billed rate, never itself counted as a transaction.

create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount > 0),
  billing_frequency text not null check (billing_frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_billing_date date not null,
  category text,
  payment_method text,
  auto_renewal boolean not null default true,
  website text,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  reminders_enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy "subscriptions_all_own" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);
create index if not exists subscriptions_next_billing_date_idx on subscriptions(next_billing_date);

alter table finance_transactions add column if not exists subscription_id uuid references subscriptions(id) on delete set null;
create index if not exists finance_transactions_subscription_id_idx on finance_transactions(subscription_id);

notify pgrst, 'reload schema';
