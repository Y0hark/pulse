import { loadConfig, type PulseConfig } from './config/pulse.js';
import { createPool } from './db/pool.js';
import { ConsoleMailer, ResendMailer, type Mailer } from './auth/mailer.js';
import { InMemorySessionStore, RedisSessionStore, type SessionStore } from './auth/sessionStore.js';
import { MagicLinkAuthProvider } from './auth/magicLinkProvider.js';
import { createApp } from './app.js';
import { runScheduledFreezes } from './services/freeze.js';
import { ensureCurrentPeriodExists } from './db/reports.js';
import type { Queryable } from './db/pool.js';

function buildMailer(config: PulseConfig): Mailer {
  if (config.mailProvider === 'resend') {
    if (!config.resendApiKey) throw new Error('RESEND_API_KEY is required when mailProvider is resend');
    return new ResendMailer({ apiKey: config.resendApiKey, from: config.mailFrom });
  }
  return new ConsoleMailer();
}

const FREEZE_CHECK_INTERVAL_MS = 60_000;
const PERIOD_CHECK_INTERVAL_MS = 60 * 60_000; // hourly is plenty; the insert is idempotent

function startFreezeScheduler(db: Queryable): void {
  setInterval(() => {
    runScheduledFreezes(db).catch((err) => {
      console.error('Scheduled freeze check failed', err);
    });
  }, FREEZE_CHECK_INTERVAL_MS);
}

function startPeriodScheduler(db: Queryable): void {
  setInterval(() => {
    ensureCurrentPeriodExists(db).catch((err) => {
      console.error('Scheduled period check failed', err);
    });
  }, PERIOD_CHECK_INTERVAL_MS);
}

async function buildSessionStore(redisUrl: string | undefined): Promise<SessionStore> {
  if (!redisUrl) return new InMemorySessionStore();
  const redisModule = await import('ioredis');
  const RedisClient = (redisModule.default ?? redisModule) as unknown as new (
    url: string,
  ) => import('./auth/sessionStore.js').RedisLikeClient & { on(event: 'error', listener: (err: Error) => void): void };
  const client = new RedisClient(redisUrl);
  // ioredis emits 'error' on every connection hiccup (Upstash blips, TLS resets, etc.);
  // an EventEmitter 'error' with no listener is an unhandled exception that crashes the
  // whole process. Log instead so a transient Redis error can't take the API down.
  client.on('error', (err) => {
    console.error('Redis client error', err);
  });
  return new RedisSessionStore(client);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createPool(config.databaseUrl);
  const sessionStore = await buildSessionStore(config.redisUrl);
  const authProvider = new MagicLinkAuthProvider({
    db,
    mailer: buildMailer(config),
    sessionStore,
    config,
  });

  const app = createApp({ authProvider, db, gamificationConfig: config.gamification, config });
  await ensureCurrentPeriodExists(db);
  startFreezeScheduler(db);
  startPeriodScheduler(db);
  app.listen(config.port, () => {
    console.log(`Pulse listening on :${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
