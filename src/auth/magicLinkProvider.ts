import { randomBytes, createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PulseConfig } from '../config/pulse.js';
import type { Queryable } from '../db/pool.js';
import { upsertUserByEmail } from '../db/users.js';
import type { AuthProvider, Session, VerifyResult } from './types.js';
import type { Mailer } from './mailer.js';
import type { SessionStore } from './sessionStore.js';
import { readCookie, setCookie, clearCookie } from './cookies.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase();
}

export interface MagicLinkProviderDeps {
  db: Queryable;
  mailer: Mailer;
  sessionStore: SessionStore;
  config: PulseConfig;
}

/** v1 AuthProvider: email magic-link + server-side session + httpOnly cookie. */
export class MagicLinkAuthProvider implements AuthProvider {
  constructor(private readonly deps: MagicLinkProviderDeps) {}

  async issueChallenge(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const { config } = this.deps;

    if (config.allowedDomains && !config.allowedDomains.includes(domainOf(email))) {
      // Silently no-op: the caller always sees 200, so this never confirms
      // or denies whether the domain (or email) is recognized.
      return;
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + config.magicLinkTtlMinutes * 60_000);

    await this.deps.db.query(
      `INSERT INTO magic_link_tokens (email, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [email, tokenHash, expiresAt],
    );

    const link = `${config.appBaseUrl}/auth/callback?token=${token}`;
    await this.deps.mailer.sendMagicLink(email, link);
  }

  async verify(token: string): Promise<VerifyResult> {
    if (!token) return { ok: false, reason: 'invalid_token' };
    const tokenHash = hashToken(token);

    const result = await this.deps.db.query(
      `SELECT id, email, expires_at, consumed_at FROM magic_link_tokens WHERE token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return { ok: false, reason: 'invalid_token' };
    if (row.consumed_at) return { ok: false, reason: 'already_used' };
    if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' };

    const { config } = this.deps;
    if (config.allowedDomains && !config.allowedDomains.includes(domainOf(row.email))) {
      return { ok: false, reason: 'domain_not_allowed' };
    }

    // Atomically claim the token so concurrent verify calls can't both succeed.
    const claim = await this.deps.db.query(
      `UPDATE magic_link_tokens SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL RETURNING id`,
      [row.id],
    );
    if (claim.rows.length === 0) return { ok: false, reason: 'already_used' };

    const user = await upsertUserByEmail(this.deps.db, row.email);
    return { ok: true, userId: user.id };
  }

  async attachSession(res: ServerResponse, userId: string): Promise<void> {
    const { config, sessionStore } = this.deps;
    const sessionId = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + config.sessionTtlMinutes * 60_000;
    await sessionStore.set(sessionId, { userId, expiresAt });
    setCookie(res, config.cookieName, sessionId, {
      maxAgeSeconds: config.sessionTtlMinutes * 60,
      secure: config.isProduction,
      crossSite: config.isProduction,
    });
  }

  async getSession(req: IncomingMessage): Promise<Session | null> {
    const sessionId = readCookie(req, this.deps.config.cookieName);
    if (!sessionId) return null;
    const record = await this.deps.sessionStore.get(sessionId);
    if (!record) return null;

    // Deactivated users (Settings > Users) lose access immediately: every request
    // re-checks is_active here rather than only at login time.
    const userResult = await this.deps.db.query(`SELECT is_active FROM users WHERE id = $1`, [record.userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].is_active === false) return null;

    return { userId: record.userId };
  }

  async destroy(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const sessionId = readCookie(req, this.deps.config.cookieName);
    if (sessionId) await this.deps.sessionStore.destroy(sessionId);
    clearCookie(res, this.deps.config.cookieName, {
      secure: this.deps.config.isProduction,
      crossSite: this.deps.config.isProduction,
    });
  }
}
