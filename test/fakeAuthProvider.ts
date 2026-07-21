import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthProvider, Session, VerifyResult } from '../src/auth/types.js';

/**
 * A trivial second AuthProvider implementation, standing in for a future
 * Entra/Teams OAuth provider. Used to prove route handlers and middleware
 * work unchanged regardless of which AuthProvider is wired in.
 */
export class FakeAuthProvider implements AuthProvider {
  loggedInUserId: string | null = null;
  destroyed = false;

  async issueChallenge(): Promise<void> {}

  async verify(token: string): Promise<VerifyResult> {
    if (token === 'valid-token') return { ok: true, userId: 'fake-user-1' };
    return { ok: false, reason: 'invalid_token' };
  }

  async attachSession(_res: ServerResponse, userId: string): Promise<void> {
    this.loggedInUserId = userId;
  }

  async getSession(_req: IncomingMessage): Promise<Session | null> {
    return this.loggedInUserId ? { userId: this.loggedInUserId } : null;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.loggedInUserId = null;
  }
}
