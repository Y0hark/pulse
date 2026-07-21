-- Pulse mission management: missions are teams with a client, a period, a reporting
-- cadence, and a lifecycle status. No new table needed — teams already carries the
-- freeze/deadline config these screens expose (up)

BEGIN;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS starts_on DATE,
  ADD COLUMN IF NOT EXISTS ends_on DATE,
  ADD COLUMN IF NOT EXISTS reporting_frequency TEXT NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE teams
  ADD CONSTRAINT teams_reporting_frequency_check
    CHECK (reporting_frequency IN ('weekly', 'biweekly', 'monthly'));

ALTER TABLE teams
  ADD CONSTRAINT teams_status_check
    CHECK (status IN ('active', 'archived'));

COMMIT;
