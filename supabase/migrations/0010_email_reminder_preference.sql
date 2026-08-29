-- LifeOS Migration 0010: Email reminder preference
-- Addendum Section 13: notification preferences, opt-in and off by
-- default (Spec Section 35: "must not become noisy by default", doubly
-- true for anything touching health reminders by email).

alter table profiles add column email_reminders_enabled boolean not null default false;
