import { Router } from 'express';
import type { AuthProvider } from '@cerdik-crm/shared';

export function authRouter(authProvider: AuthProvider): Router {
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

  return router;
}
