import type { NextFunction, Request, Response } from 'express';
import type { Queryable } from '../db/pool.js';
import { findTeamMembership } from '../db/teams.js';
import { getMissionRecord, isGlobalAdmin } from '../db/missions.js';

declare module 'express-serve-static-core' {
  interface Request {
    teamId?: string;
    teamRole?: 'member' | 'manager' | 'admin';
  }
}

/** Must run after requireAuth: relies on req.userId. Route must have a :team param (slug).
 * Global admins bypass actual membership and are treated as 'admin' on every team, so they
 * always have full access without needing a team_members row for each one. */
export function requireTeamMember(db: Queryable) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const slug = req.params.team;
    const membership = await findTeamMembership(db, slug, req.userId!);
    if (membership) {
      req.teamId = membership.teamId;
      req.teamRole = membership.role;
      next();
      return;
    }

    if (await isGlobalAdmin(db, req.userId!)) {
      const team = await getMissionRecord(db, slug);
      if (team) {
        req.teamId = team.id;
        req.teamRole = 'admin';
        next();
        return;
      }
    }

    res.status(403).json({ error: 'not_a_team_member' });
  };
}
