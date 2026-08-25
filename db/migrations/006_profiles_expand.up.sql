-- Add Scrum Master and PMO as distinct job profiles from PM, so the delivered/in-flight
-- counters can be explained per-role (see src/dashboard/profiles.ts metricGuidanceFor) (up)

BEGIN;

INSERT INTO profiles (code, label, sort_order) VALUES
  ('scrum_master', 'Scrum Master', 35),
  ('pmo',          'PMO',          45)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

COMMIT;
