-- LifeOS Migration 0040: Personal Documents
--
-- Section 64-85: Receipts is superseded here — it is NOT a separate
-- Finance module, it's one document_type inside this new top-level
-- Documents module. Drops the standalone receipts table/bucket/policies
-- from 0039 (never rewrite a past migration file — undo it forward,
-- same precedent as 0036_remove_budget.sql undoing the earlier Budget
-- tables) and creates personal_documents in its place.
--
-- personal_documents is deliberately separate from Health's `documents`
-- table (0002_health.sql / 0005_document_lab_links.sql) — Section 64:
-- "Do NOT place Personal Documents inside Health." Different shape,
-- different bucket, different RLS policies, never queried together.

-- Supabase blocks direct DELETEs on storage.buckets/storage.objects
-- (storage.protect_delete() trigger, "Use the Storage API instead" —
-- this is a platform safety rail against orphaned files, not something
-- a migration can work around with raw SQL). The old `receipts` bucket
-- row is left in place — it's empty (Receipts never actually shipped
-- with data against a live project) and unreferenced by any code or
-- policy from this point on, so it's inert. Delete it later from the
-- Supabase dashboard's Storage UI, or via the Storage API, if desired.
drop policy if exists "receipts_select_own" on storage.objects;
drop policy if exists "receipts_insert_own" on storage.objects;
drop policy if exists "receipts_delete_own" on storage.objects;
drop table if exists receipts cascade;

create table if not exists personal_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text not null,
  file_size integer not null,
  document_type text not null default 'personal_document' check (document_type in (
    'personal_document', 'receipt', 'certificate', 'contract', 'identification',
    'financial_document', 'insurance_document', 'employment_document',
    'military_document', 'education_document', 'other'
  )),
  category text,
  description text,
  tags text[] not null default '{}',
  expiration_date date,
  reminders_enabled boolean not null default true,
  reminder_lead_days integer default 30,
  pinned boolean not null default false,
  notes text,
  -- Receipt-specific, nullable — only populated when document_type = 'receipt'
  -- (Section 72: "Do not force receipt-specific fields onto normal documents").
  merchant text,
  amount numeric,
  purchase_date date,
  payment_method text,
  -- One-directional link to the actual financial transaction (Section 71:
  -- the Receipt is supporting documentation, the Expense is the real
  -- transaction — never summed together). Deleting a document severs
  -- only this FK (on delete set null), never the Expense itself.
  related_expense_id uuid references finance_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table personal_documents enable row level security;
create policy "personal_documents_all_own" on personal_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists personal_documents_user_id_idx on personal_documents(user_id);
create index if not exists personal_documents_document_type_idx on personal_documents(document_type);
create index if not exists personal_documents_expiration_date_idx on personal_documents(expiration_date);
create index if not exists personal_documents_related_expense_id_idx on personal_documents(related_expense_id);

insert into storage.buckets (id, name, public)
values ('personal-documents', 'personal-documents', false)
on conflict (id) do nothing;

create policy "personal_documents_select_own"
on storage.objects for select
using (
  bucket_id = 'personal-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "personal_documents_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'personal-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "personal_documents_delete_own"
on storage.objects for delete
using (
  bucket_id = 'personal-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
