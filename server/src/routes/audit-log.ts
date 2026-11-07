import { Router } from 'express';
import type { Pool } from 'pg';
import type { AuthProvider } from '@cerdik-crm/shared';
import { requireAuth, requireAdmin, type AuthedRequest } from './middleware';

interface AuditRow {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  occurred_at: Date;
  ip_address: string | null;
  user_name: string | null;
}

export function auditLogRouter(pool: Pool, authProvider: AuthProvider): Router {
  const router = Router();
  router.use(requireAuth(authProvider), requireAdmin());

  router.get('/', async (req: AuthedRequest, res) => {
    const { companyId } = req.auth!;
    const { rows } = await pool.query<AuditRow>(
      `SELECT audit_log.*, users.name AS user_name
       FROM audit_log LEFT JOIN users ON users.id = audit_log.user_id
       WHERE audit_log.company_id = $1
       ORDER BY audit_log.occurred_at DESC
       LIMIT 200`,
      [companyId],
    );
    res.json(
      rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        occurredAt: row.occurred_at.toISOString(),
        ipAddress: row.ip_address,
      })),
    );
  });

  return router;
}
