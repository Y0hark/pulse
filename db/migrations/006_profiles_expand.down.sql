-- Remove Scrum Master and PMO profiles (down)

BEGIN;

DELETE FROM profiles WHERE code IN ('scrum_master', 'pmo');

COMMIT;
