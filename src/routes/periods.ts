import { Router } from 'express';
import type { Queryable } from '../db/pool.js';
import { getPeriodById } from '../db/reports.js';
import { freezeTeamPeriod, getFrozenSnapshot } from '../services/freeze.js';

function parsePeriodId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export function createPeriodsRouter(db: Queryable): Router {
  const router = Router();

  router.post('/teams/:team/periods/:id/freeze', async (req, res) => {
    if (req.teamRole !== 'manager' && req.teamRole !== 'admin') {
      res.status(403).json({ error: 'not_authorized' });
      return;
    }

    const periodId = parsePeriodId(req.params.id);
    if (periodId === null) {
      res.status(400).json({ error: 'invalid_period' });
      return;
    }

    const period = await getPeriodById(db, periodId);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const snapshot = await freezeTeamPeriod(db, req.teamId!, periodId);
    res.status(200).json({ period, snapshot });
  });

  router.get('/teams/:team/periods/:id/snapshot', async (req, res) => {
    const periodId = parsePeriodId(req.params.id);
    if (periodId === null) {
      res.status(400).json({ error: 'invalid_period' });
      return;
    }

    const period = await getPeriodById(db, periodId);
    if (!period) {
      res.status(404).json({ error: 'period_not_found' });
      return;
    }

    const snapshot = await getFrozenSnapshot(db, req.teamId!, periodId);
    if (!snapshot) {
      res.status(404).json({ error: 'not_frozen' });
      return;
    }
    res.status(200).json({ period, snapshot });
  });

  return router;
}
