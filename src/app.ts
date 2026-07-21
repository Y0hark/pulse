import express, { type Express } from 'express';
import type { AuthProvider } from './auth/types.js';
import type { Queryable } from './db/pool.js';
import type { GamificationConfig } from './config/pulse.js';
import { createAuthRouter } from './routes/auth.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createGamificationRouter } from './routes/gamification.js';
import { createMeRouter } from './routes/me.js';
import { createPeriodsRouter } from './routes/periods.js';
import { createReportsRouter } from './routes/reports.js';
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
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.use(express.json());
  const gamificationConfig = deps.gamificationConfig ?? DEFAULT_GAMIFICATION_CONFIG;

  app.use(createAuthRouter(deps.authProvider));
  app.use(createMeRouter(deps.authProvider, deps.db));
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
