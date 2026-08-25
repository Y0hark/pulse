import type { IncomingMessage, ServerResponse } from 'node:http';

export interface Session {
  userId: string;
}

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid_token' | 'expired' | 'already_used' | 'domain_not_allowed' | 'not_registered' };

/**
 * Swappable identity backend. Magic-link is the v1 implementation; a future
 * Entra/Teams OAuth implementation can satisfy this same interface with no
 * changes to route handlers or middleware.
 */
export interface AuthProvider {
  issueChallenge(email: string): Promise<void>;
  verify(token: string): Promise<VerifyResult>;
  getSession(req: IncomingMessage): Promise<Session | null>;
  destroy(req: IncomingMessage, res: ServerResponse): Promise<void>;

  /** Attaches the session cookie for a verified login. Called by the callback route. */
  attachSession(res: ServerResponse, userId: string): Promise<void>;
}
