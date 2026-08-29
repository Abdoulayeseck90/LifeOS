-- LifeOS Migration 0005: Document ↔ Lab Result links
-- Spec Section 13 (Medical Documents): Document.related_lab_result_ids
-- was defined in the spec but missing from 0001_core.sql. Needed before
-- the document upload flow can let a user link an uploaded report to
-- the lab results it contains (Spec Section 39.2).
--
-- This is a multi-valued reference (one document can back multiple lab
-- results), which Postgres cannot enforce with a plain foreign key on
-- an array column. Per Spec Section 20/28 ("document any polymorphic
-- reference and its enforcement strategy explicitly"), this uses the
-- same trigger-validation treatment already established for
-- timeline_events in 0003_audit_and_timeline.sql: every id in the array
-- must exist in lab_results and be owned by the same user.

alter table documents add column related_lab_result_ids uuid[] not null default '{}';

create or replace function validate_document_lab_result_links()
returns trigger as $$
declare
  invalid_count integer;
begin
  if new.related_lab_result_ids is null or array_length(new.related_lab_result_ids, 1) is null then
    return new;
  end if;

  select count(*) into invalid_count
  from unnest(new.related_lab_result_ids) as lab_id
  where not exists (
    select 1 from lab_results
    where id = lab_id and user_id = new.user_id
  );

  if invalid_count > 0 then
    raise exception 'related_lab_result_ids contains % id(s) that do not exist in lab_results (or are not owned by this user)', invalid_count;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger validate_document_lab_result_links_trigger
  before insert or update on documents
  for each row execute procedure validate_document_lab_result_links();
