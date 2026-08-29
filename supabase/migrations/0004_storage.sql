-- LifeOS Migration 0004: Storage
-- Spec Section 32 (Security & Privacy): private buckets only, no public
-- medical documents. Files are stored under {user_id}/{document_id}/{filename}
-- so the RLS policy below can check ownership from the path itself.

insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do nothing;

create policy "medical_documents_select_own"
on storage.objects for select
using (
  bucket_id = 'medical-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "medical_documents_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'medical-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "medical_documents_delete_own"
on storage.objects for delete
using (
  bucket_id = 'medical-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Reminder (Spec Section 6.2): when generating signed URLs against this
-- bucket from application code, keep expiry short (minutes, not hours) —
-- a leaked signed URL to a lab report is a leaked lab report.
