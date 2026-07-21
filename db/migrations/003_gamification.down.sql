-- Pulse gamification: per-team leaderboard opt-in (down)

BEGIN;

ALTER TABLE team_members
  DROP COLUMN IF EXISTS leaderboard_opt_in;

COMMIT;
