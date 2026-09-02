-- Medical Documents UI parity with Personal Documents: adds Pin/Unpin,
-- which the `documents` table (0001_core.sql) has no column for yet.
-- No RLS/grant changes — `documents_all_own` already covers full CRUD
-- scoped to `auth.uid() = user_id`, which is everything a PATCH toggling
-- this column needs.
alter table documents add column pinned boolean not null default false;
