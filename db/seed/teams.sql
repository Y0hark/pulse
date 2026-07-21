-- Seed: first team (idempotent)
INSERT INTO teams (name, slug, timezone, freeze_dow, freeze_time, freeze_mode)
VALUES ('CEVA Logistics', 'ceva-logistics', 'Europe/Paris', 2, '09:30', 'both')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  timezone = EXCLUDED.timezone,
  freeze_dow = EXCLUDED.freeze_dow,
  freeze_time = EXCLUDED.freeze_time,
  freeze_mode = EXCLUDED.freeze_mode;
