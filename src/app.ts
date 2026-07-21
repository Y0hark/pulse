import express, { type Express } from 'express';
import type { AuthProvider } from './auth/types.js';
import type { Queryable } from './db/pool.js';
import { createAuthRouter } from './routes/auth.js';
import { createDashboardRouter } from './routes/dashboard.js';
import { createMeRouter } from './routes/me.js';
import { createPeriodsRouter } from './routes/periods.js';
import { createReportsRouter } from './routes/reports.js';
import { requireAuth } from './middleware/requireAuth.js';
import { requireTeamMember } from './middleware/requireTeamMember.js';

export interface AppDeps {
  authProvider: AuthProvider;
  db: Queryable;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.use(express.json());

  app.use(createAuthRouter(deps.authProvider));
  app.use(createMeRouter(deps.authProvider, deps.db));
  app.use('/teams/:team', requireAuth(deps.authProvider), requireTeamMember(deps.db));
  app.use(createReportsRouter(deps.db));
  app.use(createDashboardRouter(deps.db));
  app.use(createPeriodsRouter(deps.db));

  // Example of a protected route, to be extended by later Pulse tickets.
  app.get('/protected/ping', requireAuth(deps.authProvider), (req, res) => {
    res.status(200).json({ ok: true, userId: req.userId });
  });

  return app;
}
