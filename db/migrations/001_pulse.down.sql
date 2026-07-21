-- Pulse foundational data model (down)
-- Drops in reverse dependency order. Extensions are left in place since
-- other objects outside this migration may depend on them.

BEGIN;

DROP TABLE IF EXISTS period_snapshots;
DROP TABLE IF EXISTS opportunities;
DROP TABLE IF EXISTS report_items;
DROP TABLE IF EXISTS project_cards;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS team_period_status;
DROP TABLE IF EXISTS report_periods;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS profiles;

COMMIT;
