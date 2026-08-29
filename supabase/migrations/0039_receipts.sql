-- LifeOS Migration 0039: Receipts
--
-- A Receipt is supporting documentation for a purchase — it optionally
-- links to ONE existing Expense (finance_transactions row) via
-- expense_id, but is never itself summed into any Finance total (Section
-- 33: "Receipt -> Supporting Document -> Expense", "do not duplicate
-- transactions"). Same private-bucket + {user_id}/{record_id}/{filename}
-- + 3-policy RLS pattern as medical-documents (0004_storage.sql).

create table if not exists receipts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant text not null,
  amount numeric not null check (amount > 0),
  date date not null,
  category text,
  payment_method text,
  notes text,
  storage_path text not null,
  mime_type text not null,
  file_size integer not null,
  expense_id uuid references finance_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table receipts enable row level security;
create policy "receipts_all_own" on receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists receipts_user_id_idx on receipts(user_id);
create index if not exists receipts_date_idx on receipts(date);
create index if not exists receipts_expense_id_idx on receipts(expense_id);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_select_own"
on storage.objects for select
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "receipts_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "receipts_delete_own"
on storage.objects for delete
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
