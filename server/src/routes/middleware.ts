import type { NextFunction, Request, Response } from 'express';
import type { AuthProvider, AuthTokenPayload } from '@cerdik-crm/shared';

export interface AuthedRequest extends Request {
  auth?: AuthTokenPayload;
}

export function requireAuth(authProvider: AuthProvider) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }
    const auth = await authProvider.verifyToken(token);
    if (!auth) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    req.auth = auth;
    next();
  };
}

/** Mount after `requireAuth` — 403s any non-admin request. */
export function requireAdmin() {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth?.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  };
}
