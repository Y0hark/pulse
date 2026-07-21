import { Router } from 'express';
import type { AuthProvider } from '../auth/types.js';
import type { Queryable } from '../db/pool.js';
import { getUserWithTeams } from '../db/users.js';

export function createMeRouter(authProvider: AuthProvider, db: Queryable): Router {
  const router = Router();

  router.get('/me', async (req, res) => {
    const session = await authProvider.getSession(req);
    if (!session) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    const user = await getUserWithTeams(db, session.userId);
    if (!user) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      profile: user.profile,
      teams: user.teams,
    });
  });

  return router;
}
