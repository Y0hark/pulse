import type { NextFunction, Request, Response } from 'express';
import type { Queryable } from '../db/pool.js';
import { isGlobalAdmin } from '../db/missions.js';

/** Must run after requireAuth: relies on req.userId. Gates mission create/edit/archive —
 * the only role this app currently distinguishes for mission management (per Pulse ticket
 * scope: no per-mission admin roles yet, see GUARD in the mission-management ticket). */
export function requireGlobalAdmin(db: Queryable) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const admin = await isGlobalAdmin(db, req.userId!);
    if (!admin) {
      res.status(403).json({ error: 'not_authorized' });
      return;
    }
    next();
  };
}
