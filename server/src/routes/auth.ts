import { Router } from 'express';
import type { Pool } from 'pg';
import type { AuthProvider } from '@cerdik-crm/shared';
import { requireAuth, type AuthedRequest } from './middleware';

export function authRouter(authProvider: AuthProvider, pool: Pool): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    try {
      const result = await authProvider.login(email, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Login failed' });
    }
  });

  /** Persists the session's picked extension to `users.extension` (previously
   * only ever written to the browser's localStorage) and hands back a token
   * carrying the new value, so server-side extension scoping stays correct
   * for the rest of the session without a DB round-trip per request. */
  router.post('/extension', requireAuth(authProvider), async (req: AuthedRequest, res) => {
    const { userId, companyId, isAdmin } = req.auth!;
    const extension = typeof req.body?.extension === 'string' ? req.body.extension.trim() : '';
    if (!extension) {
      res.status(400).json({ error: 'extension is required' });
      return;
    }
    await pool.query('UPDATE users SET extension = $1 WHERE id = $2 AND company_id = $3', [
      extension,
      userId,
      companyId,
    ]);
    const token = await authProvider.refreshToken({ userId, companyId, isAdmin, extension });
    res.json({ ok: true, token });
  });

  return router;
}
