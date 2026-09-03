-- Global Calendar + recurring appointments. Extends the existing
-- `appointments` table in place (no new/duplicate table) so there
-- remains exactly one underlying appointment record, per the explicit
-- requirement that Health-relatedness (category='medical' +
-- related_condition_id, both already/now on this same row) is a facet
-- of an appointment, never a second appointment system.
--
-- Recurrence uses RFC 5545 RRULE text (parsed client- and server-side
-- with the `rrule` npm package), anchored on date_time as DTSTART, not
-- a proprietary format. UNTIL=/COUNT= inside recurrence_rule itself
-- cover "ends on a date" / "ends after N occurrences" -- no separate
-- recurrence_end_date/recurrence_count columns needed.
--
-- Occurrences are never persisted as separate rows. A recurring row
-- (the "master") represents the whole series; two mechanisms handle
-- exceptions without ever duplicating data:
--   - recurrence_excluded_occurrences: original occurrence instants to
--     skip entirely (a plain cancellation, or the "before" side of a
--     moved/edited single occurrence).
--   - an "override" row: a normal, non-recurring appointments row with
--     recurrence_parent_id (which series) + recurrence_original_start
--     (which original instant it replaces) set -- RFC 5545's
--     RECURRENCE-ID pattern. Its own date_time/fields are whatever the
--     user changed that single occurrence to.

alter table appointments alter column provider_name drop not null;

alter table appointments add column title text;
alter table appointments add column description text;
alter table appointments add column end_time timestamptz;
alter table appointments add column category text not null default 'medical'
  check (category in ('medical', 'work', 'personal', 'financial', 'travel', 'other'));
alter table appointments add column reminder_lead_minutes integer
  check (reminder_lead_minutes is null or reminder_lead_minutes > 0);
alter table appointments add column recurrence_rule text;
alter table appointments add column recurrence_excluded_occurrences timestamptz[] not null default '{}';
alter table appointments add column recurrence_parent_id uuid references appointments(id) on delete cascade;
alter table appointments add column recurrence_original_start timestamptz;

-- Every existing row already has provider_name (medical, pre-dating
-- this migration) and now defaults to category='medical' automatically
-- via the ALTER above -- nothing here can leave a row unlabeled.
alter table appointments add constraint appointments_has_label
  check (title is not null or provider_name is not null);

-- An override row is never itself a recurring master, and always
-- records which original instant it replaces; a master/standalone row
-- never sets these override-only fields.
alter table appointments add constraint appointments_override_shape
  check (
    (recurrence_parent_id is null and recurrence_original_start is null)
    or
    (recurrence_parent_id is not null and recurrence_original_start is not null and recurrence_rule is null)
  );

create index appointments_recurrence_parent_id_idx on appointments(recurrence_parent_id) where recurrence_parent_id is not null;

-- Both functions below run with the CALLER's own privileges (not
-- security definer) -- every statement is still checked against
-- appointments_all_own's existing RLS policy exactly as if the client
-- issued it directly, the same pattern used for pay_bill() in
-- 0045_bill_debt_linking.sql. p_fields carries the full desired field
-- set (the TypeScript service layer already has the current row and
-- merges in the user's edits before calling this) -- extracted via
-- plain ->>'key' lookups against a hardcoded set of column names, never
-- dynamic SQL, so there is no injection surface regardless of what a
-- caller puts in the JSONB values.
create or replace function update_appointment_scoped(
  p_id uuid,
  p_scope text,
  p_occurrence_start timestamptz,
  p_fields jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_master appointments%rowtype;
  v_result appointments%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_master from appointments where id = p_id and user_id = v_user_id;
  if not found then
    raise exception 'Appointment not found';
  end if;

  if p_scope = 'series' then
    update appointments set
      title = p_fields->>'title',
      description = p_fields->>'description',
      provider_name = p_fields->>'provider_name',
      specialty = p_fields->>'specialty',
      appointment_type = p_fields->>'appointment_type',
      date_time = (p_fields->>'date_time')::timestamptz,
      end_time = nullif(p_fields->>'end_time', '')::timestamptz,
      location = p_fields->>'location',
      category = p_fields->>'category',
      status = coalesce(p_fields->>'status', 'scheduled'),
      related_condition_id = nullif(p_fields->>'related_condition_id', '')::uuid,
      preparation_notes = p_fields->>'preparation_notes',
      clinician_instructions = p_fields->>'clinician_instructions',
      follow_up_date = nullif(p_fields->>'follow_up_date', '')::date,
      notes = p_fields->>'notes',
      reminder_lead_minutes = nullif(p_fields->>'reminder_lead_minutes', '')::integer,
      recurrence_rule = p_fields->>'recurrence_rule',
      updated_at = now()
    where id = p_id and user_id = v_user_id
    returning * into v_result;

  elsif p_scope = 'this' then
    if p_occurrence_start is null then
      raise exception 'occurrence_start required for scope=this';
    end if;
    if v_master.recurrence_parent_id is not null then
      raise exception 'Cannot apply "this occurrence" scope to an already-overridden occurrence';
    end if;

    update appointments
    set recurrence_excluded_occurrences = array_append(coalesce(recurrence_excluded_occurrences, '{}'), p_occurrence_start)
    where id = p_id and user_id = v_user_id;

    insert into appointments (
      user_id, title, description, provider_name, specialty, appointment_type,
      date_time, end_time, location, category, status, related_condition_id,
      preparation_notes, clinician_instructions, follow_up_date, notes,
      reminder_lead_minutes, recurrence_parent_id, recurrence_original_start
    ) values (
      v_user_id, p_fields->>'title', p_fields->>'description', p_fields->>'provider_name',
      p_fields->>'specialty', p_fields->>'appointment_type',
      (p_fields->>'date_time')::timestamptz, nullif(p_fields->>'end_time', '')::timestamptz,
      p_fields->>'location', p_fields->>'category', coalesce(p_fields->>'status', 'scheduled'),
      nullif(p_fields->>'related_condition_id', '')::uuid,
      p_fields->>'preparation_notes', p_fields->>'clinician_instructions',
      nullif(p_fields->>'follow_up_date', '')::date, p_fields->>'notes',
      nullif(p_fields->>'reminder_lead_minutes', '')::integer,
      p_id, p_occurrence_start
    )
    returning * into v_result;

  elsif p_scope = 'following' then
    if p_occurrence_start is null then
      raise exception 'occurrence_start required for scope=following';
    end if;
    if v_master.recurrence_rule is null then
      raise exception 'Cannot apply "this and following" scope to a non-recurring appointment';
    end if;

    -- Cap the original series just before this occurrence. Strips any
    -- existing UNTIL=/COUNT= first so the rule never ends up with two
    -- (RFC 5545 forbids a rule carrying both, and forbids UNTIL twice).
    update appointments
    set recurrence_rule =
      regexp_replace(regexp_replace(v_master.recurrence_rule, ';?UNTIL=[^;]*', '', 'g'), ';?COUNT=[^;]*', '', 'g')
      || ';UNTIL=' || to_char(p_occurrence_start - interval '1 second', 'YYYYMMDD"T"HH24MISS"Z"')
    where id = p_id and user_id = v_user_id;

    -- New master row carries the series forward from this occurrence.
    -- p_fields.recurrence_rule reflects the user's final choice (the
    -- client already has the original rule and passes it through
    -- unchanged unless the user actually edited the recurrence).
    insert into appointments (
      user_id, title, description, provider_name, specialty, appointment_type,
      date_time, end_time, location, category, status, related_condition_id,
      preparation_notes, clinician_instructions, follow_up_date, notes,
      reminder_lead_minutes, recurrence_rule
    ) values (
      v_user_id, p_fields->>'title', p_fields->>'description', p_fields->>'provider_name',
      p_fields->>'specialty', p_fields->>'appointment_type',
      (p_fields->>'date_time')::timestamptz, nullif(p_fields->>'end_time', '')::timestamptz,
      p_fields->>'location', p_fields->>'category', coalesce(p_fields->>'status', 'scheduled'),
      nullif(p_fields->>'related_condition_id', '')::uuid,
      p_fields->>'preparation_notes', p_fields->>'clinician_instructions',
      nullif(p_fields->>'follow_up_date', '')::date, p_fields->>'notes',
      nullif(p_fields->>'reminder_lead_minutes', '')::integer,
      p_fields->>'recurrence_rule'
    )
    returning * into v_result;

  else
    raise exception 'Invalid scope';
  end if;

  return to_jsonb(v_result);
end;
$$;
revoke all on function update_appointment_scoped(uuid, text, timestamptz, jsonb) from public;
grant execute on function update_appointment_scoped(uuid, text, timestamptz, jsonb) to authenticated;

create or replace function delete_appointment_scoped(
  p_id uuid,
  p_scope text,
  p_occurrence_start timestamptz
)
returns void
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_master appointments%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_master from appointments where id = p_id and user_id = v_user_id;
  if not found then
    raise exception 'Appointment not found';
  end if;

  if p_scope = 'series' then
    delete from appointments where id = p_id and user_id = v_user_id;

  elsif p_scope = 'this' then
    if p_occurrence_start is null then
      raise exception 'occurrence_start required for scope=this';
    end if;

    if v_master.recurrence_parent_id is not null then
      -- Target IS an override row (an already-moved/edited single
      -- occurrence) -- just remove it. The excluded_occurrences entry
      -- already recorded on the master when this override was created
      -- is what keeps the original instant from reappearing.
      delete from appointments where id = p_id and user_id = v_user_id;
    else
      update appointments
      set recurrence_excluded_occurrences = array_append(coalesce(recurrence_excluded_occurrences, '{}'), p_occurrence_start)
      where id = p_id and user_id = v_user_id;
    end if;

  elsif p_scope = 'following' then
    if p_occurrence_start is null then
      raise exception 'occurrence_start required for scope=following';
    end if;
    if v_master.recurrence_rule is null then
      raise exception 'Cannot apply "this and following" scope to a non-recurring appointment';
    end if;

    update appointments
    set recurrence_rule =
      regexp_replace(regexp_replace(v_master.recurrence_rule, ';?UNTIL=[^;]*', '', 'g'), ';?COUNT=[^;]*', '', 'g')
      || ';UNTIL=' || to_char(p_occurrence_start - interval '1 second', 'YYYYMMDD"T"HH24MISS"Z"')
    where id = p_id and user_id = v_user_id;

  else
    raise exception 'Invalid scope';
  end if;
end;
$$;
revoke all on function delete_appointment_scoped(uuid, text, timestamptz) from public;
grant execute on function delete_appointment_scoped(uuid, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';
