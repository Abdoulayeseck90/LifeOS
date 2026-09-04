-- Gig Driving work module (personal DoorDash / Uber Eats / Walmart
-- Spark driving). Reuses existing systems rather than duplicating them:
--   - Schedule = a real Calendar appointment (category='work') with two
--     new gig-specific nullable columns, the same pattern already used
--     for medical-specific columns on this same shared table.
--   - Receipts = the existing personal_documents/private-storage system,
--     via two new nullable FKs (mirrors related_expense_id).
--   - Reminders = the existing appointments pipeline for shifts (free,
--     no new code) and the existing "documents" category for vehicle/
--     tax dates -- no new NotificationPreferences category.
-- Deliberately NOT touching finance_transactions: gig earnings/expenses
-- are their own tables, never auto-inserted into the general ledger,
-- for the same double-counting reason debt_payments was kept separate
-- from finance_transactions (0045_bill_debt_linking.sql).

alter table appointments add column gig_platforms text[];
alter table appointments add column gig_earnings_goal numeric;

create table gig_vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  make text,
  model text,
  year integer,
  nickname text,
  -- Last 4 digits only -- spec: "do NOT store unnecessary sensitive
  -- vehicle information."
  license_plate_last4 varchar(4),
  current_odometer numeric,
  insurance_expiration date,
  registration_expiration date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table gig_vehicles enable row level security;
create policy "gig_vehicles_all_own" on gig_vehicles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index gig_vehicles_user_id_idx on gig_vehicles(user_id);

create table gig_vehicle_maintenance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references gig_vehicles(id) on delete cascade,
  date date not null default current_date,
  type text not null check (type in ('oil_change', 'tire_rotation', 'tire_replacement', 'brake_service', 'repair', 'other')),
  mileage numeric,
  cost numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table gig_vehicle_maintenance enable row level security;
create policy "gig_vehicle_maintenance_all_own" on gig_vehicle_maintenance for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index gig_vehicle_maintenance_user_id_idx on gig_vehicle_maintenance(user_id);
create index gig_vehicle_maintenance_vehicle_id_idx on gig_vehicle_maintenance(vehicle_id);

-- total_miles is deliberately NOT stored -- always end_odometer minus
-- start_odometer at query time, so it can never drift from the two
-- numbers it's derived from (spec: "Do not make the user manually enter
-- total miles if both odometer values exist").
create table gig_shifts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references gig_vehicles(id) on delete set null,
  date date not null default current_date,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  start_odometer numeric not null,
  end_odometer numeric,
  platforms text[] not null default '{}',
  notes text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  -- Optional link to the Calendar schedule item this shift fulfilled --
  -- powers "Schedule vs Actual" without a second calendar concept.
  scheduled_appointment_id uuid references appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gig_shifts_end_after_start check (end_odometer is null or end_odometer >= start_odometer)
);
alter table gig_shifts enable row level security;
create policy "gig_shifts_all_own" on gig_shifts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index gig_shifts_user_id_idx on gig_shifts(user_id);
create index gig_shifts_date_idx on gig_shifts(date);
-- The actual guard against Quick Start firing twice (double-click,
-- retry, two tabs) -- a DB constraint, not just an app-level check,
-- same "the constraint is the real idempotency guarantee" reasoning
-- already applied to debt_payments.bill_id unique.
create unique index gig_shifts_one_in_progress_per_user on gig_shifts(user_id) where status = 'in_progress';

-- One row per platform per shift -- a shift can span DoorDash + Uber
-- Eats + Spark (spec: "Do not assume a shift can only belong to one
-- platform").
create table gig_earnings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_id uuid not null references gig_shifts(id) on delete cascade,
  platform text not null check (platform in ('doordash', 'ubereats', 'spark', 'other')),
  gross numeric not null default 0 check (gross >= 0),
  tips numeric not null default 0 check (tips >= 0),
  bonuses numeric not null default 0 check (bonuses >= 0),
  other numeric not null default 0 check (other >= 0),
  created_at timestamptz not null default now()
);
alter table gig_earnings enable row level security;
create policy "gig_earnings_all_own" on gig_earnings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index gig_earnings_user_id_idx on gig_earnings(user_id);
create index gig_earnings_shift_id_idx on gig_earnings(shift_id);

create table gig_expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references gig_vehicles(id) on delete set null,
  shift_id uuid references gig_shifts(id) on delete set null,
  platform text check (platform in ('doordash', 'ubereats', 'spark', 'other')),
  category text not null check (category in ('fuel', 'maintenance', 'tires', 'repairs', 'car_wash', 'parking', 'tolls', 'phone', 'other')),
  amount numeric not null check (amount > 0),
  date date not null default current_date,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table gig_expenses enable row level security;
create policy "gig_expenses_all_own" on gig_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index gig_expenses_user_id_idx on gig_expenses(user_id);
create index gig_expenses_shift_id_idx on gig_expenses(shift_id);
create index gig_expenses_vehicle_id_idx on gig_expenses(vehicle_id);

-- Per-tax-year configurable rate rather than a hardcoded constant --
-- spec: "Do not hard-code outdated tax rules... make tax-year-specific
-- values configurable." No default is seeded; the Taxes view shows an
-- explicit "set a rate for this year" state when none exists, rather
-- than silently assuming a rate the user never confirmed.
create table gig_tax_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  standard_mileage_rate numeric not null check (standard_mileage_rate > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tax_year)
);
alter table gig_tax_settings enable row level security;
create policy "gig_tax_settings_all_own" on gig_tax_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index gig_tax_settings_user_id_idx on gig_tax_settings(user_id);

-- Mirrors the existing related_expense_id pattern on personal_documents
-- (a direct nullable FK per relationship, never a polymorphic column).
alter table personal_documents add column related_gig_expense_id uuid references gig_expenses(id) on delete set null;
alter table personal_documents add column related_gig_maintenance_id uuid references gig_vehicle_maintenance(id) on delete set null;
create index personal_documents_related_gig_expense_id_idx on personal_documents(related_gig_expense_id);
create index personal_documents_related_gig_maintenance_id_idx on personal_documents(related_gig_maintenance_id);

-- Atomic "End Shift": completes the shift plus writes every
-- earnings-per-platform row and every expense row for it in one
-- transaction -- same invoker-rights pattern as pay_bill()
-- (0045_bill_debt_linking.sql). Not security definer: RLS on
-- gig_shifts/gig_earnings/gig_expenses still gates every statement
-- exactly as if the client issued each one directly; auth.uid() is
-- read internally, never trusted from a parameter.
create or replace function end_gig_shift(
  p_shift_id uuid,
  p_end_time timestamptz,
  p_end_odometer numeric,
  p_notes text,
  p_earnings jsonb, -- [{platform, gross, tips, bonuses, other}, ...]
  p_expenses jsonb  -- [{category, amount, description, platform}, ...]
)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_shift gig_shifts%rowtype;
  v_earning jsonb;
  v_expense jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update gig_shifts
  set end_time = p_end_time,
      end_odometer = p_end_odometer,
      notes = coalesce(p_notes, notes),
      status = 'completed',
      updated_at = now()
  where id = p_shift_id and user_id = v_user_id and status = 'in_progress'
  returning * into v_shift;

  if not found then
    raise exception 'Shift not found or already ended';
  end if;

  for v_earning in select * from jsonb_array_elements(coalesce(p_earnings, '[]'::jsonb))
  loop
    insert into gig_earnings (user_id, shift_id, platform, gross, tips, bonuses, other)
    values (
      v_user_id, p_shift_id,
      v_earning->>'platform',
      coalesce((v_earning->>'gross')::numeric, 0),
      coalesce((v_earning->>'tips')::numeric, 0),
      coalesce((v_earning->>'bonuses')::numeric, 0),
      coalesce((v_earning->>'other')::numeric, 0)
    );
  end loop;

  for v_expense in select * from jsonb_array_elements(coalesce(p_expenses, '[]'::jsonb))
  loop
    -- Defensive: gig_expenses.amount has a > 0 check constraint, so a
    -- blank/zero row from the client is silently skipped here rather
    -- than failing the whole atomic end-shift call.
    if coalesce((v_expense->>'amount')::numeric, 0) > 0 then
      insert into gig_expenses (user_id, shift_id, vehicle_id, platform, category, amount, date, description)
      values (
        v_user_id, p_shift_id, v_shift.vehicle_id,
        nullif(v_expense->>'platform', ''),
        v_expense->>'category',
        (v_expense->>'amount')::numeric,
        v_shift.date,
        nullif(v_expense->>'description', '')
      );
    end if;
  end loop;

  return to_jsonb(v_shift);
end;
$$;
revoke all on function end_gig_shift(uuid, timestamptz, numeric, text, jsonb, jsonb) from public;
grant execute on function end_gig_shift(uuid, timestamptz, numeric, text, jsonb, jsonb) to authenticated;

-- update_appointment_scoped() (0048_calendar_appointments.sql) needs to
-- carry the two new gig_platforms/gig_earnings_goal columns through its
-- series/this/following writes too, or editing a gig schedule item
-- would silently drop them. Same signature (uuid, text, timestamptz,
-- jsonb) -- create or replace is enough, no drop needed.
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
      gig_platforms = case when p_fields ? 'gig_platforms' and p_fields->'gig_platforms' is not null
        then array(select jsonb_array_elements_text(p_fields->'gig_platforms')) else null end,
      gig_earnings_goal = nullif(p_fields->>'gig_earnings_goal', '')::numeric,
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
      gig_platforms, gig_earnings_goal,
      reminder_lead_minutes, recurrence_parent_id, recurrence_original_start
    ) values (
      v_user_id, p_fields->>'title', p_fields->>'description', p_fields->>'provider_name',
      p_fields->>'specialty', p_fields->>'appointment_type',
      (p_fields->>'date_time')::timestamptz, nullif(p_fields->>'end_time', '')::timestamptz,
      p_fields->>'location', p_fields->>'category', coalesce(p_fields->>'status', 'scheduled'),
      nullif(p_fields->>'related_condition_id', '')::uuid,
      p_fields->>'preparation_notes', p_fields->>'clinician_instructions',
      nullif(p_fields->>'follow_up_date', '')::date, p_fields->>'notes',
      case when p_fields ? 'gig_platforms' and p_fields->'gig_platforms' is not null
        then array(select jsonb_array_elements_text(p_fields->'gig_platforms')) else null end,
      nullif(p_fields->>'gig_earnings_goal', '')::numeric,
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

    update appointments
    set recurrence_rule =
      regexp_replace(regexp_replace(v_master.recurrence_rule, ';?UNTIL=[^;]*', '', 'g'), ';?COUNT=[^;]*', '', 'g')
      || ';UNTIL=' || to_char(p_occurrence_start - interval '1 second', 'YYYYMMDD"T"HH24MISS"Z"')
    where id = p_id and user_id = v_user_id;

    insert into appointments (
      user_id, title, description, provider_name, specialty, appointment_type,
      date_time, end_time, location, category, status, related_condition_id,
      preparation_notes, clinician_instructions, follow_up_date, notes,
      gig_platforms, gig_earnings_goal,
      reminder_lead_minutes, recurrence_rule
    ) values (
      v_user_id, p_fields->>'title', p_fields->>'description', p_fields->>'provider_name',
      p_fields->>'specialty', p_fields->>'appointment_type',
      (p_fields->>'date_time')::timestamptz, nullif(p_fields->>'end_time', '')::timestamptz,
      p_fields->>'location', p_fields->>'category', coalesce(p_fields->>'status', 'scheduled'),
      nullif(p_fields->>'related_condition_id', '')::uuid,
      p_fields->>'preparation_notes', p_fields->>'clinician_instructions',
      nullif(p_fields->>'follow_up_date', '')::date, p_fields->>'notes',
      case when p_fields ? 'gig_platforms' and p_fields->'gig_platforms' is not null
        then array(select jsonb_array_elements_text(p_fields->'gig_platforms')) else null end,
      nullif(p_fields->>'gig_earnings_goal', '')::numeric,
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

notify pgrst, 'reload schema';
