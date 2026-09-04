-- Gig Driving tax filing export. Two independent changes:
--   1. gig_expenses gains an "insurance" category -- the tax export's
--      Expenses section needs it and no existing category covers it.
--      Additive only: existing rows are unaffected.
--   2. gig_tax_exports records an audit snapshot of each generated
--      "final tax package" (the ZIP download only -- ad hoc CSV/Excel/PDF
--      downloads don't snapshot). This is NOT a lock on the underlying
--      shifts/earnings/expenses -- those stay fully editable, and a new
--      snapshot can always be generated later reflecting the current
--      data. `snapshot` holds the full computed export payload as of
--      generation time, so "what exactly was included" stays answerable
--      even after later edits.

alter table gig_expenses drop constraint gig_expenses_category_check;
alter table gig_expenses add constraint gig_expenses_category_check
  check (category in ('fuel', 'maintenance', 'tires', 'repairs', 'car_wash', 'parking', 'tolls', 'phone', 'insurance', 'other'));

create table gig_tax_exports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  vehicle_id uuid references gig_vehicles(id) on delete set null,
  platforms text[],
  generated_at timestamptz not null default now(),
  income_record_count integer not null,
  mileage_record_count integer not null,
  expense_record_count integer not null,
  total_income numeric not null,
  total_mileage numeric not null,
  total_expenses numeric not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table gig_tax_exports enable row level security;
create policy "gig_tax_exports_all_own" on gig_tax_exports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index gig_tax_exports_user_id_idx on gig_tax_exports(user_id);
create index gig_tax_exports_tax_year_idx on gig_tax_exports(tax_year);

notify pgrst, 'reload schema';
