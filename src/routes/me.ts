import { Router } from 'express';
import type { AuthProvider } from '../auth/types.js';
import type { Queryable } from '../db/pool.js';
import { getUserWithTeams, updateDisplayName } from '../db/users.js';

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
      displayName: user.displayName,
      profile: user.profile,
      isGlobalAdmin: user.isGlobalAdmin,
      teams: user.teams,
    });
  });

  router.patch('/me', async (req, res) => {
    const session = await authProvider.getSession(req);
    if (!session) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }

    const displayName = (req.body as Record<string, unknown> | null)?.displayName;
    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      res.status(400).json({ error: 'invalid_display_name' });
      return;
    }

    await updateDisplayName(db, session.userId, displayName.trim());
    res.status(200).json({ displayName: displayName.trim() });
  });

  return router;
}
