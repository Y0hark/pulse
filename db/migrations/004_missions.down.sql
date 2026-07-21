-- Pulse mission management (down)

BEGIN;

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_reporting_frequency_check;

ALTER TABLE teams
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS reporting_frequency,
  DROP COLUMN IF EXISTS ends_on,
  DROP COLUMN IF EXISTS starts_on,
  DROP COLUMN IF EXISTS client_name;

COMMIT;
