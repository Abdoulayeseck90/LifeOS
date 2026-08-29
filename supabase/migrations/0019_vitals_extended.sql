-- LifeOS Migration 0019: Vitals — extended structure
--
-- Inspected the existing schema first (Spec Section 19): `vitals`
-- (0014_vitals.sql) and `body_metrics` (0002_health.sql, still home to
-- Weight/Height/BMI/waist/body-fat — Section 19 explicitly says evolve
-- the existing model rather than build a redundant one) already cover
-- almost everything this spec asks for. This migration only adds what's
-- genuinely missing: optional linking to a source document/appointment/
-- condition, an explicit entry-source label, room to preserve (never
-- compute) a reference range/interpretation from an imported record,
-- a calculated-vs-recorded flag for BMI, and body_metrics' previously
-- missing `updated_at` (every other health table already has one).
--
-- vitals gets a new `source` column directly (the table is new this
-- session, no prior column to collide with). body_metrics already has
-- a free-text `source` column with a different, pre-existing meaning
-- (a device/method label like "Apple Watch" — see body-metric-form.tsx)
-- — that stays untouched; the new structured entry-source concept gets
-- its own `entry_source` column there instead of overloading the old one.

alter table vitals add column if not exists source text not null default 'manual'
  check (source in ('manual', 'medical_visit', 'imported', 'other'));
alter table vitals add column if not exists source_document_id uuid references documents(id) on delete set null;
alter table vitals add column if not exists related_appointment_id uuid references appointments(id) on delete set null;
alter table vitals add column if not exists related_condition_id uuid references conditions(id) on delete set null;
-- Only ever populated by preserving a value a source medical record
-- already stated (Section 10) — LifeOS itself must never compute or
-- infer either of these.
alter table vitals add column if not exists source_interpretation text;
alter table vitals add column if not exists source_reference_range text;

alter table body_metrics add column if not exists entry_source text not null default 'manual'
  check (entry_source in ('manual', 'medical_visit', 'imported', 'other'));
alter table body_metrics add column if not exists source_document_id uuid references documents(id) on delete set null;
alter table body_metrics add column if not exists related_appointment_id uuid references appointments(id) on delete set null;
alter table body_metrics add column if not exists related_condition_id uuid references conditions(id) on delete set null;
alter table body_metrics add column if not exists source_interpretation text;
alter table body_metrics add column if not exists source_reference_range text;
-- Section 6: a BMI row computed by LifeOS from a paired height+weight
-- entry is marked true; a BMI value the user typed directly (e.g.
-- transcribing one already printed on a medical record) is false — so
-- a later recompute never silently overwrites/conflicts with an
-- explicitly-provided value.
alter table body_metrics add column if not exists is_calculated boolean not null default false;
alter table body_metrics add column if not exists updated_at timestamptz not null default now();

create index if not exists vitals_source_document_id_idx on vitals(source_document_id);
create index if not exists vitals_related_appointment_id_idx on vitals(related_appointment_id);
create index if not exists body_metrics_source_document_id_idx on body_metrics(source_document_id);
create index if not exists body_metrics_related_appointment_id_idx on body_metrics(related_appointment_id);

notify pgrst, 'reload schema';
