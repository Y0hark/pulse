-- Seed: profiles lookup (idempotent)
INSERT INTO profiles (code, label, sort_order) VALUES
  ('ba',         'BA',         10),
  ('po',         'PO',         20),
  ('pm',         'PM',         30),
  ('manager',    'Manager',    40),
  ('consultant', 'Consultant', 50),
  ('other',      'Other',      60)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;
