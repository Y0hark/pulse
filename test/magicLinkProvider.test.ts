import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/pulse.js';
import { MagicLinkAuthProvider } from '../src/auth/magicLinkProvider.js';
import { InMemorySessionStore } from '../src/auth/sessionStore.js';
import type { Mailer } from '../src/auth/mailer.js';
import { FakeDb } from './fakeDb.js';

class CapturingMailer implements Mailer {
  sent: { email: string; link: string }[] = [];
  async sendMagicLink(email: string, link: string): Promise<void> {
    this.sent.push({ email, link });
  }
}

function buildProvider(overrides: Partial<ReturnType<typeof loadConfig>> = {}) {
  const config = { ...loadConfig({}), magicLinkTtlMinutes: 15, sessionTtlMinutes: 60, ...overrides };
  const db = new FakeDb();
  const mailer = new CapturingMailer();
  const sessionStore = new InMemorySessionStore();
  const provider = new MagicLinkAuthProvider({ db, mailer, sessionStore, config });
  return { provider, db, mailer, sessionStore, config };
}

function tokenFromLink(link: string): string {
  return new URL(link).searchParams.get('token')!;
}

describe('MagicLinkAuthProvider', () => {
  it('issues a token and verifies it for an admin-registered user', async () => {
    const { provider, mailer, db } = buildProvider();
    db.seedUser(randomUUID(), 'someone@example.com');

    await provider.issueChallenge('Someone@Example.com');
    expect(mailer.sent).toHaveLength(1);

    const token = tokenFromLink(mailer.sent[0].link);
    const result = await provider.verify(token);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBeTruthy();
    }
  });

  it('auto-provisions only the configured bootstrap admin email', async () => {
    const { provider, mailer } = buildProvider({ bootstrapAdminEmail: 'admin@example.com' });

    await provider.issueChallenge('admin@example.com');
    expect(mailer.sent).toHaveLength(1);

    const token = tokenFromLink(mailer.sent[0].link);
    const result = await provider.verify(token);
    expect(result.ok).toBe(true);
  });

  it('never sends a link or creates an account for an unregistered email', async () => {
    const { provider, mailer, db } = buildProvider();

    await provider.issueChallenge('nobody@example.com');

    expect(mailer.sent).toHaveLength(0);
    expect(db.users).toHaveLength(0);
  });

  it('rejects a token that has already been used', async () => {
    const { provider, mailer, db } = buildProvider();
    db.seedUser(randomUUID(), 'a@example.com');
    await provider.issueChallenge('a@example.com');
    const token = tokenFromLink(mailer.sent[0].link);

    const first = await provider.verify(token);
    const second = await provider.verify(token);

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: 'already_used' });
  });

  it('rejects an expired token', async () => {
    const { provider, mailer, db } = buildProvider({ magicLinkTtlMinutes: -1 });
    db.seedUser(randomUUID(), 'a@example.com');
    await provider.issueChallenge('a@example.com');
    const token = tokenFromLink(mailer.sent[0].link);

    const result = await provider.verify(token);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects an unknown token without leaking details', async () => {
    const { provider } = buildProvider();
    const result = await provider.verify('not-a-real-token');
    expect(result).toEqual({ ok: false, reason: 'invalid_token' });
  });

  it('enforces the domain allowlist by silently skipping disallowed domains', async () => {
    const { provider, mailer, db } = buildProvider({ allowedDomains: ['ceva-logistics.com'] });
    db.seedUser(randomUUID(), 'someone@other.com');
    db.seedUser(randomUUID(), 'someone@ceva-logistics.com');

    await provider.issueChallenge('someone@other.com');
    expect(mailer.sent).toHaveLength(0);

    await provider.issueChallenge('someone@ceva-logistics.com');
    expect(mailer.sent).toHaveLength(1);
  });

  it('rejects a deactivated user\'s session on the very next getSession call', async () => {
    const { provider, mailer, db } = buildProvider();
    db.seedUser(randomUUID(), 'a@example.com');
    await provider.issueChallenge('a@example.com');
    const token = tokenFromLink(mailer.sent[0].link);
    const result = await provider.verify(token);
    if (!result.ok) throw new Error('expected verify to succeed');

    let cookieValue = '';
    const fakeRes = {
      getHeader: () => undefined,
      setHeader: (_name: string, value: string) => {
        cookieValue = Array.isArray(value) ? value[0] : value;
      },
    } as unknown as import('node:http').ServerResponse;
    await provider.attachSession(fakeRes, result.userId);
    const sessionId = decodeURIComponent(cookieValue.split(';')[0].split('=')[1]);
    const fakeReq = { headers: { cookie: `pulse_session=${sessionId}` } } as unknown as import('node:http').IncomingMessage;

    expect(await provider.getSession(fakeReq)).toEqual({ userId: result.userId });

    db.users.find((u) => u.id === result.userId)!.is_active = false;

    expect(await provider.getSession(fakeReq)).toBeNull();
  });
});
