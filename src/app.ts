import express, { type Express } from 'express';
import type { AuthProvider } from './auth/types.js';
import type { Queryable } from './db/pool.js';
import type { GamificationConfig, PulseConfig } from './config/pulse.js';
import { runScheduledFreezes } from './services/freeze.js';
import { createAuthRouter } from './routes/auth.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createGamificationRouter } from './routes/gamification.js';
import { createMeRouter } from './routes/me.js';
import { createMissionsRouter } from './routes/missions.js';
import { createPeriodsRouter } from './routes/periods.js';
import { createReportsRouter } from './routes/reports.js';
import { createUsersRouter } from './routes/users.js';
import { requireAuth } from './middleware/requireAuth.js';
import { requireTeamMember } from './middleware/requireTeamMember.js';

const DEFAULT_GAMIFICATION_CONFIG: GamificationConfig = {
  onTimeXp: 10,
  lateXpDecayPerHour: 1,
  streakBreaksOnLate: true,
  badgeStreakThresholds: [4, 8, 12],
};

export interface AppDeps {
  authProvider: AuthProvider;
  db: Queryable;
  gamificationConfig?: GamificationConfig;
  config?: Pick<PulseConfig, 'corsOrigin' | 'internalTaskSecret'>;
}

/** Frontend (Cloudflare Pages) and API (Render) are different origins in production, so
 * cross-site fetches with credentials need an explicit CORS allowlist rather than '*'. */
function applyCors(app: Express, origin: string | undefined): void {
  if (!origin) return;
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).end();
      return;
    }
    next();
  });
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  applyCors(app, deps.config?.corsOrigin);
  app.use(express.json());
  const gamificationConfig = deps.gamificationConfig ?? DEFAULT_GAMIFICATION_CONFIG;

  app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

  // Hit by an external scheduler (cron-job.org) since Render's free plan can idle the
  // process between requests, which would otherwise silently pause the in-process
  // setInterval freeze check in server.ts. Idempotent, so overlapping calls are safe.
  app.post('/internal/tasks/freeze', async (req, res) => {
    const secret = deps.config?.internalTaskSecret;
    if (!secret || req.header('x-internal-secret') !== secret) {
      res.status(403).json({ error: 'not_authorized' });
      return;
    }
    await runScheduledFreezes(deps.db);
    res.status(200).json({ ok: true });
  });

  app.use(createAuthRouter(deps.authProvider));
  app.use(createMeRouter(deps.authProvider, deps.db));
  app.use(createMissionsRouter(deps.authProvider, deps.db));
  app.use(createUsersRouter(deps.authProvider, deps.db));
  app.use('/teams/:team', requireAuth(deps.authProvider), requireTeamMember(deps.db));
  app.use(createReportsRouter(deps.db));
  app.use(createDashboardRouter(deps.db));
  app.use(createPeriodsRouter(deps.db));
  app.use(createGamificationRouter(deps.db, gamificationConfig));

  // Example of a protected route, to be extended by later Pulse tickets.
  app.get('/protected/ping', requireAuth(deps.authProvider), (req, res) => {
    res.status(200).json({ ok: true, userId: req.userId });
  });

  return app;
}
