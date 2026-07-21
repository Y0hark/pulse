-- Pulse gamification: per-team leaderboard opt-in (up)
-- Streak/XP/completion-ring are computed on the fly from existing reports + report_periods,
-- so no new tables are needed for those. Opt-in state is the only new persisted fact.

BEGIN;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN NOT NULL DEFAULT false;

COMMIT;
