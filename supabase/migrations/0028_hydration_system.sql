-- LifeOS Migration 0028: Hydration & Drinks
--
-- Adds a per-user fluid log plus optional hydration target/unit
-- preferences. No universal water prescription is stored anywhere —
-- hydration_target_ml is a nullable user override; when null the app
-- falls back to a general adult estimate (2.0-2.5 L/day) that is
-- always labeled "general estimate," never a medical prescription
-- (Section 27/37). Alcoholic beverages are deliberately not a valid
-- beverage_type value — they are never logged toward hydration
-- (Section 28/34).

alter table nutrition_preferences
  add column if not exists hydration_unit text check (hydration_unit in ('L', 'mL', 'fl_oz')),
  add column if not exists hydration_target_ml numeric;

create table if not exists hydration_log_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  beverage_type text not null check (beverage_type in ('water', 'sparkling_water', 'unsweetened_tea', 'coffee', 'other')),
  amount_ml numeric not null check (amount_ml > 0),
  created_at timestamptz not null default now()
);
alter table hydration_log_entries enable row level security;
create policy "hydration_log_entries_all_own" on hydration_log_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists hydration_log_entries_user_date_idx on hydration_log_entries(user_id, date);

notify pgrst, 'reload schema';
