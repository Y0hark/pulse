import { Router } from 'express';
import type { AuthProvider } from '../auth/types.js';

export function createAuthRouter(authProvider: AuthProvider): Router {
  const router = Router();

  router.post('/auth/magic-link', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    if (email.trim() !== '') {
      await authProvider.issueChallenge(email);
    }
    // Always 200: never confirm or deny whether an email is registered.
    res.status(200).json({ ok: true });
  });

  router.get('/auth/callback', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const result = await authProvider.verify(token);
    if (!result.ok) {
      res.redirect(302, `/auth/error?reason=${result.reason}`);
      return;
    }
    await authProvider.attachSession(res, result.userId);
    res.redirect(302, '/');
  });

  router.post('/auth/logout', async (req, res) => {
    await authProvider.destroy(req, res);
    res.status(200).json({ ok: true });
  });

  return router;
}
