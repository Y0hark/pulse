import { loadConfig } from './config/pulse.js';
import { createPool } from './db/pool.js';
import { ConsoleMailer } from './auth/mailer.js';
import { InMemorySessionStore, RedisSessionStore, type SessionStore } from './auth/sessionStore.js';
import { MagicLinkAuthProvider } from './auth/magicLinkProvider.js';
import { createApp } from './app.js';
import { runScheduledFreezes } from './services/freeze.js';
import type { Queryable } from './db/pool.js';

const FREEZE_CHECK_INTERVAL_MS = 60_000;

function startFreezeScheduler(db: Queryable): void {
  setInterval(() => {
    runScheduledFreezes(db).catch((err) => {
      console.error('Scheduled freeze check failed', err);
    });
  }, FREEZE_CHECK_INTERVAL_MS);
}

async function buildSessionStore(redisUrl: string | undefined): Promise<SessionStore> {
  if (!redisUrl) return new InMemorySessionStore();
  const redisModule = await import('ioredis');
  const RedisClient = (redisModule.default ?? redisModule) as unknown as new (url: string) => import('./auth/sessionStore.js').RedisLikeClient;
  return new RedisSessionStore(new RedisClient(redisUrl));
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createPool(config.databaseUrl);
  const sessionStore = await buildSessionStore(config.redisUrl);
  const authProvider = new MagicLinkAuthProvider({
    db,
    mailer: new ConsoleMailer(),
    sessionStore,
    config,
  });

  const app = createApp({ authProvider, db });
  startFreezeScheduler(db);
  app.listen(config.port, () => {
    console.log(`Pulse listening on :${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
