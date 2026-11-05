import type { Pool } from 'pg';

/**
 * Appends one row to audit_log. Never updated or deleted by any route —
 * that's what makes it a trustworthy "who did what, when" record.
 */
export async function writeAuditLog(
  pool: Pool,
  entry: {
    companyId: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    ipAddress?: string | null;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (company_id, user_id, action, entity_type, entity_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.companyId, entry.userId, entry.action, entry.entityType, entry.entityId ?? null, entry.ipAddress ?? null],
  );
}
