-- LifeOS Migration 0036: Remove Budget
--
-- Budget is explicitly not part of this version of LifeOS. `if exists` /
-- `cascade` make this safe whether or not 0034_finance.sql (which
-- created this table) was ever applied.

drop table if exists budgets cascade;

notify pgrst, 'reload schema';
