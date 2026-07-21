-- Pulse foundational data model (up)
-- Multi-team from v1: reports, freeze state, and snapshots are scoped per team.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS profiles (            -- BA / PO / PM / Manager / Consultant / Other
  id SMALLSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  display_name TEXT,
  profile_id SMALLINT REFERENCES profiles(id),
  is_global_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (                 -- e.g. CEVA Logistics
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  freeze_dow SMALLINT NOT NULL DEFAULT 2,      -- ISO dow: 1=Mon..7=Sun; 2=Tuesday
  freeze_time TIME NOT NULL DEFAULT '09:30',   -- local to timezone
  freeze_mode TEXT NOT NULL DEFAULT 'both',    -- auto|manual|both
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teams_freeze_dow_check CHECK (freeze_dow BETWEEN 1 AND 7),
  CONSTRAINT teams_freeze_mode_check CHECK (freeze_mode IN ('auto', 'manual', 'both'))
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',         -- member|manager|admin (per team)
  PRIMARY KEY (team_id, user_id),
  CONSTRAINT team_members_role_check CHECK (role IN ('member', 'manager', 'admin'))
);

CREATE TABLE IF NOT EXISTS report_periods (        -- global ISO-week calendar, e.g. '2026-W30'
  id SERIAL PRIMARY KEY,
  iso_week TEXT UNIQUE NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS team_period_status (    -- freeze state is per team
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period_id INT NOT NULL REFERENCES report_periods(id),
  status TEXT NOT NULL DEFAULT 'open',         -- open|frozen
  frozen_at TIMESTAMPTZ,
  PRIMARY KEY (team_id, period_id),
  CONSTRAINT team_period_status_status_check CHECK (status IN ('open', 'frozen'))
);

CREATE TABLE IF NOT EXISTS reports (               -- one per user PER TEAM per period
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  period_id INT NOT NULL REFERENCES report_periods(id),
  workload SMALLINT NOT NULL CHECK (workload BETWEEN 0 AND 100),
  delivered_cnt INT NOT NULL DEFAULT 0 CHECK (delivered_cnt >= 0),
  inflight_cnt INT NOT NULL DEFAULT 0 CHECK (inflight_cnt >= 0),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_id, period_id)
);

CREATE TABLE IF NOT EXISTS project_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('good', 'at_risk', 'blocked')),
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS report_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('task_done', 'task_upcoming', 'alert')),
  content TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warn', 'critical'))
);

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN
    ('open_position', 'new_project', 'new_budget', 'new_team', 'client_need')),
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS period_snapshots (      -- keyed by team + period
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period_id INT NOT NULL REFERENCES report_periods(id),
  payload JSONB NOT NULL,
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_team_period ON reports (team_id, period_id);
CREATE INDEX IF NOT EXISTS idx_project_cards_report ON project_cards (report_id);
CREATE INDEX IF NOT EXISTS idx_report_items_report ON report_items (report_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_report ON opportunities (report_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);

COMMIT;
