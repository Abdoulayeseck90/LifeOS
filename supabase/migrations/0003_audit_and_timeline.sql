-- LifeOS Migration 0003: Timeline and Audit
-- Spec Section 20 (Health Timeline), Section 33 (Audit History).
--
-- related_entity_type / related_entity_id is a polymorphic reference:
-- Postgres cannot express "entity_id is a valid row in whichever table
-- entity_type names" as a real foreign key. Spec Section 20 flags this
-- explicitly and requires a documented enforcement strategy rather than
-- leaving it implicit. This migration enforces it with a trigger that
-- checks entity_id exists in the named table before allowing the insert
-- or update — the tradeoff is a small amount of per-write overhead and
-- a hard-coded table allowlist that must be extended when a new domain
-- (Planning, Finance, ...) introduces new timeline-linkable entities.

create table timeline_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  date_time timestamptz not null,
  title text not null,
  description text,
  domain text not null,
  related_entity_type text,
  related_entity_id uuid,
  source_document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table timeline_events enable row level security;
create policy "timeline_events_all_own" on timeline_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index timeline_events_user_id_idx on timeline_events(user_id);
create index timeline_events_date_time_idx on timeline_events(date_time);
create index timeline_events_related_entity_idx on timeline_events(related_entity_type, related_entity_id);

create or replace function validate_timeline_related_entity()
returns trigger as $$
declare
  row_exists boolean;
begin
  if new.related_entity_type is null or new.related_entity_id is null then
    return new;
  end if;

  case new.related_entity_type
    when 'condition' then
      select exists(select 1 from conditions where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'lab_result' then
      select exists(select 1 from lab_results where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'medication' then
      select exists(select 1 from medications where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'appointment' then
      select exists(select 1 from appointments where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'symptom_entry' then
      select exists(select 1 from symptom_entries where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'body_metric' then
      select exists(select 1 from body_metrics where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    when 'document' then
      select exists(select 1 from documents where id = new.related_entity_id and user_id = new.user_id) into row_exists;
    else
      raise exception 'Unknown related_entity_type: %. Add it to validate_timeline_related_entity() when a new domain introduces it.', new.related_entity_type;
  end case;

  if not row_exists then
    raise exception 'related_entity_id % does not exist in table for type % (or is not owned by this user)', new.related_entity_id, new.related_entity_type;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger validate_timeline_related_entity_trigger
  before insert or update on timeline_events
  for each row execute procedure validate_timeline_related_entity();

-- ---------------------------------------------------------------------
-- Audit events (Spec 33). Same polymorphic-reference situation as
-- timeline, but audit rows are written by services after a change has
-- already succeeded against a real table, so no trigger validation is
-- applied here — the entity_type/entity_id pairing is only as
-- trustworthy as the service code writing it (src/services/core/audit.ts).
-- ---------------------------------------------------------------------
create table audit_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor text not null,
  action text not null check (action in ('create', 'update', 'delete')),
  entity_type text not null,
  entity_id uuid not null,
  timestamp timestamptz not null default now(),
  metadata jsonb
);
alter table audit_events enable row level security;
create policy "audit_events_select_own" on audit_events for select using (auth.uid() = user_id);
-- Insert-only from the service layer via security-definer function below —
-- no direct client insert policy, so audit rows can't be forged or edited
-- from the browser even though RLS is enabled.
create index audit_events_user_id_idx on audit_events(user_id);
create index audit_events_entity_idx on audit_events(entity_type, entity_id);

create or replace function write_audit_event(
  p_actor text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default null
) returns uuid as $$
declare
  new_id uuid;
begin
  insert into audit_events (user_id, actor, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_actor, p_action, p_entity_type, p_entity_id, p_metadata)
  returning id into new_id;
  return new_id;
end;
$$ language plpgsql security definer;
