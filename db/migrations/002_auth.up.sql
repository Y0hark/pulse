-- Pulse auth: magic-link challenge tokens (up)

BEGIN;

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,   -- sha256(token); raw token is never persisted or logged
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON magic_link_tokens (email);

COMMIT;
