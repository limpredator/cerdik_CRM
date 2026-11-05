import { Router } from 'express';
import type { Pool } from 'pg';
import type { AuthProvider, PbxConnector } from '@cerdik-crm/shared';
import { normalizePhone } from '@cerdik-crm/shared';
import { writeAuditLog } from '../audit';
import { requireAuth, type AuthedRequest } from './middleware';

interface CallRow {
  id: string;
  company_id: string;
  pbx_call_id: string;
  direction: string;
  from_e164: string;
  to_e164: string;
  extension: string | null;
  contact_id: string | null;
  started_at: Date;
  answered_at: Date | null;
  ended_at: Date | null;
  duration_sec: number;
  disposition: string;
  recording_file: string | null;
  contact_name: string | null;
}

function toCall(row: CallRow) {
  return {
    id: row.id,
    pbxCallId: row.pbx_call_id,
    direction: row.direction,
    fromE164: row.from_e164,
    toE164: row.to_e164,
    extension: row.extension,
    contactId: row.contact_id,
    contactName: row.contact_name,
    startedAt: row.started_at.toISOString(),
    answeredAt: row.answered_at?.toISOString() ?? null,
    endedAt: row.ended_at?.toISOString() ?? null,
    durationSec: row.duration_sec,
    disposition: row.disposition,
    recordingFile: row.recording_file,
  };
}

export function callsRouter(pool: Pool, authProvider: AuthProvider, connector: PbxConnector): Router {
  const router = Router();
  router.use(requireAuth(authProvider));

  router.get('/', async (req: AuthedRequest, res) => {
    const { companyId } = req.auth!;
    const { rows } = await pool.query<CallRow>(
      `SELECT calls.*, contacts.name AS contact_name
       FROM calls LEFT JOIN contacts ON contacts.id = calls.contact_id
       WHERE calls.company_id = $1
       ORDER BY calls.started_at DESC
       LIMIT 200`,
      [companyId],
    );
    res.json(rows.map(toCall));
  });

  /** Unanswered inbound calls, grouped by the caller's number — the
   * "missed calls" list the agent screen's sidebar shows. */
  router.get('/missed', async (req: AuthedRequest, res) => {
    const { companyId } = req.auth!;
    const { rows } = await pool.query<{
      from_e164: string;
      contact_name: string | null;
      contact_id: string | null;
      count: string;
      last_at: Date;
    }>(
      `SELECT calls.from_e164, contacts.name AS contact_name, contacts.id AS contact_id,
              COUNT(*) AS count, MAX(calls.started_at) AS last_at
       FROM calls LEFT JOIN contacts ON contacts.id = calls.contact_id
       WHERE calls.company_id = $1 AND calls.direction = 'inbound' AND calls.disposition != 'answered'
       GROUP BY calls.from_e164, contacts.name, contacts.id
       ORDER BY last_at DESC
       LIMIT 100`,
      [companyId],
    );
    res.json(
      rows.map((row) => ({
        fromE164: row.from_e164,
        contactId: row.contact_id,
        contactName: row.contact_name,
        count: Number(row.count),
        lastAt: row.last_at.toISOString(),
      })),
    );
  });

  router.get('/:id', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    const { rows } = await pool.query<CallRow>(
      `SELECT calls.*, contacts.name AS contact_name
       FROM calls LEFT JOIN contacts ON contacts.id = calls.contact_id
       WHERE calls.id = $1 AND calls.company_id = $2`,
      [req.params.id, companyId],
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await writeAuditLog(pool, { companyId, userId, action: 'call.view', entityType: 'call', entityId: req.params.id });
    res.json(toCall(rows[0]));
  });

  /** Click-to-dial: the agent's currently-picked extension (see the web
   * app's ExtensionPicker — the session's choice, not necessarily the
   * users.extension column) rings `target`. */
  router.post('/dial', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    let extension = typeof req.body?.extension === 'string' ? req.body.extension.trim() : '';
    if (!extension) {
      const { rows } = await pool.query<{ extension: string | null }>(`SELECT extension FROM users WHERE id = $1`, [
        userId,
      ]);
      extension = rows[0]?.extension ?? '';
    }
    if (!extension) {
      res.status(400).json({ error: 'No extension selected or configured' });
      return;
    }
    const targetRaw = req.body?.target;
    if (typeof targetRaw !== 'string' || !targetRaw.trim()) {
      res.status(400).json({ error: 'target is required' });
      return;
    }
    // Extensions dial each other with their bare number; anything else is
    // normalized to E.164 first so outbound PSTN numbers always dial clean.
    const target = /^\d{2,5}$/.test(targetRaw.trim()) ? targetRaw.trim() : normalizePhone(targetRaw) ?? targetRaw.trim();
    try {
      await connector.dial(extension, target);
      await writeAuditLog(pool, { companyId, userId, action: 'call.dial', entityType: 'call', entityId: target });
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Dial failed' });
    }
  });

  return router;
}
