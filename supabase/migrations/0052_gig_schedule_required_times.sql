-- Gig Driving scheduling fixes: require start+end time for work-category
-- appointments, and a bulk-insert RPC for Plan Week / Plan Month.
--
-- The edit/delete "unreliable" bug was a client-side scope-classification
-- bug (an already-overridden recurring occurrence was still being treated
-- as "part of a series" and offered this/following scopes the RPCs only
-- support on a real recurring master) -- fixed in application code, no DB
-- change needed for that part. See src/lib/calendar/appointment-status.ts
-- (isRecurringMaster) and its two call sites.

-- end_time stays optional for every other category (medical/personal/
-- financial/travel/other never had it and don't need it) -- this is
-- deliberately scoped to category='work' only, never a blanket NOT NULL.
-- `not valid` enforces the rule on every future INSERT/UPDATE without
-- requiring a backfill of pre-existing gig schedule rows that predate
-- this feature (some already have end_time = null) -- those rows keep
-- displaying fine and simply can't be re-saved until the user fills in
-- an end time, which the app-level validation also requires going
-- forward.
alter table appointments add constraint appointments_work_requires_end_time
  check (category <> 'work' or (end_time is not null and end_time > date_time))
  not valid;

-- Plan Week / Plan Month: create N standalone appointment rows (no
-- recurrence_rule, no parent/series id -- each behaves exactly like a
-- manually created single shift, per spec) in one atomic transaction.
-- Same invoker-rights pattern as update_appointment_scoped()/
-- end_gig_shift() -- RLS on `appointments` still gates every row exactly
-- as if the client inserted each one directly; user_id always comes from
-- auth.uid(), never trusted from the payload. Being one PL/pgSQL call,
-- Postgres wraps the whole loop in a single transaction: if any item
-- fails (e.g. a work item missing end_time), the exception aborts the
-- whole batch and nothing is inserted -- never a partial batch.
create or replace function create_appointments_bulk(p_items jsonb)
returns setof appointments
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    return query insert into appointments (
      user_id, title, date_time, end_time, category, status,
      gig_platforms, gig_earnings_goal, notes
    ) values (
      v_user_id,
      v_item->>'title',
      (v_item->>'date_time')::timestamptz,
      nullif(v_item->>'end_time', '')::timestamptz,
      coalesce(v_item->>'category', 'work'),
      coalesce(v_item->>'status', 'scheduled'),
      case when v_item ? 'gig_platforms' and v_item->'gig_platforms' is not null
        then array(select jsonb_array_elements_text(v_item->'gig_platforms')) else null end,
      nullif(v_item->>'gig_earnings_goal', '')::numeric,
      nullif(v_item->>'notes', '')
    )
    returning *;
  end loop;
end;
$$;
revoke all on function create_appointments_bulk(jsonb) from public;
grant execute on function create_appointments_bulk(jsonb) to authenticated;

notify pgrst, 'reload schema';
