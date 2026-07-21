import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/pulse.js';
import { MagicLinkAuthProvider } from '../src/auth/magicLinkProvider.js';
import { InMemorySessionStore } from '../src/auth/sessionStore.js';
import type { Mailer } from '../src/auth/mailer.js';
import { FakeDb } from './fakeDb.js';
import { FakeAuthProvider } from './fakeAuthProvider.js';

class CapturingMailer implements Mailer {
  sent: { email: string; link: string }[] = [];
  async sendMagicLink(email: string, link: string): Promise<void> {
    this.sent.push({ email, link });
  }
}

function extractCookie(res: request.Response, name: string): string {
  const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  const match = (setCookie ?? []).find((c) => c.startsWith(`${name}=`));
  if (!match) throw new Error(`cookie ${name} not set`);
  return match.split(';')[0];
}

describe('full magic-link flow (MagicLinkAuthProvider)', () => {
  it('logs in via email link and reaches /me with team memberships', async () => {
    const config = loadConfig({});
    const db = new FakeDb();
    const mailer = new CapturingMailer();
    const sessionStore = new InMemorySessionStore();
    const authProvider = new MagicLinkAuthProvider({ db, mailer, sessionStore, config });
    const app = createApp({ authProvider, db });

    await request(app).get('/me').expect(401);
    await request(app).get('/protected/ping').expect(401);

    await request(app).post('/auth/magic-link').send({ email: 'user@example.com' }).expect(200, { ok: true });
    expect(mailer.sent).toHaveLength(1);

    const token = new URL(mailer.sent[0].link).searchParams.get('token')!;
    const callbackRes = await request(app).get(`/auth/callback?token=${token}`).expect(302);
    expect(callbackRes.headers.location).toBe('/');
    const cookie = extractCookie(callbackRes, config.cookieName);

    const meRes = await request(app).get('/me').set('Cookie', cookie).expect(200);
    expect(meRes.body.email).toBe('user@example.com');
    expect(meRes.body.teams).toEqual([]);

    await request(app).get('/protected/ping').set('Cookie', cookie).expect(200);

    await request(app).post('/auth/logout').set('Cookie', cookie).expect(200);
    await request(app).get('/me').set('Cookie', cookie).expect(401);
  });

  it('never confirms whether an email exists', async () => {
    const config = loadConfig({});
    const db = new FakeDb();
    const mailer = new CapturingMailer();
    const authProvider = new MagicLinkAuthProvider({ db, mailer, sessionStore: new InMemorySessionStore(), config });
    const app = createApp({ authProvider, db });

    await request(app).post('/auth/magic-link').send({ email: 'nobody@example.com' }).expect(200, { ok: true });
  });

  it('rejects an invalid token via redirect, without a session', async () => {
    const config = loadConfig({});
    const db = new FakeDb();
    const authProvider = new MagicLinkAuthProvider({
      db,
      mailer: new CapturingMailer(),
      sessionStore: new InMemorySessionStore(),
      config,
    });
    const app = createApp({ authProvider, db });

    const res = await request(app).get('/auth/callback?token=bogus').expect(302);
    expect(res.headers.location).toContain('reason=invalid_token');
    await request(app).get('/me').expect(401);
  });
});

describe('AuthProvider swap (DONE-WHEN: no handler changes)', () => {
  it('the same routes work unmodified against a different AuthProvider implementation', async () => {
    const authProvider = new FakeAuthProvider();
    const db = new FakeDb();
    const app = createApp({ authProvider, db });

    await request(app).get('/protected/ping').expect(401);

    await request(app).get('/auth/callback?token=valid-token').expect(302);
    const pingRes = await request(app).get('/protected/ping').expect(200);
    expect(pingRes.body.userId).toBe('fake-user-1');

    await request(app).post('/auth/logout').expect(200);
    expect(authProvider.destroyed).toBe(true);
    await request(app).get('/protected/ping').expect(401);
  });
});
