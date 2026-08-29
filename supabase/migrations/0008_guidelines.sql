-- LifeOS Migration 0008: Guidelines (versioned reference data)
-- Addendum Section 19: guideline-derived schedules must be versionable,
-- and a guideline must never silently change a user's established
-- clinician-defined monitoring plan. Guidelines are therefore shared,
-- read-only reference data — like test_definitions (0002_health.sql),
-- not user-owned rows — maintained by migration/seed, never written by
-- the app itself. A monitoring_item can optionally cite one; citing a
-- guideline never mutates the item, and updating a guideline row never
-- touches any monitoring_item that cites it.

create table guidelines (
  id uuid primary key default uuid_generate_v4(),
  organization text not null,
  title text not null,
  publication_year integer,
  version text,
  source text,
  applicable_conditions text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table guidelines enable row level security;
create policy "guidelines_read_all" on guidelines
  for select using (auth.role() = 'authenticated');

grant select on guidelines to anon, authenticated;

-- Deferred from 0007_health_monitoring.sql until this table existed —
-- nullable, set-null on delete so removing/updating a guideline never
-- breaks or silently reinterprets an existing monitoring item.
alter table monitoring_items add column guideline_id uuid references guidelines(id) on delete set null;
