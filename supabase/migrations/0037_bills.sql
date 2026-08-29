-- LifeOS Migration 0037: Bills
--
-- A Bill is money the user is EXPECTED to pay — distinct from an
-- Expense (money actually spent). Marking a bill paid creates exactly
-- one linked finance_transactions row (bill_id below) and records that
-- link back on the bill (linked_transaction_id) so a second "Mark as
-- Paid" click can never create a duplicate Expense. A recurring bill
-- never spawns new rows — its own due_date advances and status resets
-- to 'pending' on payment, so the bill row IS the recurring template
-- (Section 24: "do not create unnecessary duplicate bill records").
--
-- Upcoming/Due Today/Overdue are display states DERIVED from due_date
-- vs today, computed in the application layer (same pattern as
-- getMonitoringItemDisplayStatus for Health) — only the states that
-- represent real stored facts (pending/paid/cancelled) live in the
-- status column.

create table if not exists bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount > 0),
  due_date date not null,
  category text,
  is_recurring boolean not null default false,
  frequency text check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  auto_pay boolean not null default false,
  payment_method text,
  business_id uuid references businesses(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  linked_transaction_id uuid references finance_transactions(id) on delete set null,
  reminders_enabled boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table bills enable row level security;
create policy "bills_all_own" on bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists bills_user_id_idx on bills(user_id);
create index if not exists bills_due_date_idx on bills(due_date);
create index if not exists bills_business_id_idx on bills(business_id);

alter table finance_transactions add column if not exists bill_id uuid references bills(id) on delete set null;
create index if not exists finance_transactions_bill_id_idx on finance_transactions(bill_id);

notify pgrst, 'reload schema';
