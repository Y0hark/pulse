-- User administration: lets Settings deactivate a user without deleting their
-- history (reports, mission memberships stay intact).

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMIT;
