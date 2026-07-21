import type { NextFunction, Request, Response } from 'express';
import type { AuthProvider } from '../auth/types.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function requireAuth(authProvider: AuthProvider) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = await authProvider.getSession(req);
    if (!session) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    req.userId = session.userId;
    next();
  };
}
