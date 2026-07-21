import { Router } from 'express';
import type { Queryable } from '../db/pool.js';
import { getCurrentPeriod, getPeriodByIsoWeek } from '../db/reports.js';
import { getTeamDashboard } from '../services/aggregation.js';

export function createDashboardRouter(db: Queryable): Router {
  const router = Router();

  router.get('/teams/:team/dashboard', async (req, res) => {
    const isoWeek = req.query.period;
    const period =
      typeof isoWeek === 'string' && isoWeek.trim() !== ''
        ? await getPeriodByIsoWeek(db, isoWeek)
        : await getCurrentPeriod(db);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const aggregate = await getTeamDashboard(db, req.teamId!, period.id);
    res.status(200).json({ period, aggregate });
  });

  return router;
}
