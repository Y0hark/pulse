-- User administration (down)

BEGIN;

ALTER TABLE users
  DROP COLUMN IF EXISTS is_active;

COMMIT;
