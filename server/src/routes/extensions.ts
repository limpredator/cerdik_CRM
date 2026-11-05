import { Router } from 'express';
import type { AuthProvider, PbxConnector } from '@cerdik-crm/shared';
import { requireAuth } from './middleware';

export function extensionsRouter(authProvider: AuthProvider, connector: PbxConnector): Router {
  const router = Router();
  router.use(requireAuth(authProvider));

  router.get('/', async (_req, res) => {
    try {
      const list = await connector.extensionList();
      res.json(list);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to list extensions' });
    }
  });

  return router;
}
