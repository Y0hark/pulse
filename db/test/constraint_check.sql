-- Manual constraint smoke test (not part of migrations; run against a scratch DB)
BEGIN;

INSERT INTO users (email, display_name) VALUES ('alice@example.com', 'Alice') RETURNING id \gset alice_
INSERT INTO report_periods (iso_week, starts_on, ends_on)
  VALUES ('2026-W30', '2026-07-20', '2026-07-26') RETURNING id \gset period_

INSERT INTO reports (user_id, team_id, period_id, workload)
  SELECT :'alice_id', id, :'period_id', 50 FROM teams WHERE slug = 'ceva-logistics';

-- This second insert for the same user/team/period must fail the UNIQUE constraint.
INSERT INTO reports (user_id, team_id, period_id, workload)
  SELECT :'alice_id', id, :'period_id', 60 FROM teams WHERE slug = 'ceva-logistics';

ROLLBACK;
