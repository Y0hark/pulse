import type { NextFunction, Request, Response } from 'express';
import type { Queryable } from '../db/pool.js';
import { findTeamMembership } from '../db/teams.js';

declare module 'express-serve-static-core' {
  interface Request {
    teamId?: string;
    teamRole?: 'member' | 'manager' | 'admin';
  }
}

/** Must run after requireAuth: relies on req.userId. Route must have a :team param (slug). */
export function requireTeamMember(db: Queryable) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const slug = req.params.team;
    const membership = await findTeamMembership(db, slug, req.userId!);
    if (!membership) {
      res.status(403).json({ error: 'not_a_team_member' });
      return;
    }
    req.teamId = membership.teamId;
    req.teamRole = membership.role;
    next();
  };
}
