import { Router } from 'express';
import type { Pool } from 'pg';
import type { AuthProvider } from '@cerdik-crm/shared';
import { config } from '../config';
import { writeAuditLog } from '../audit';
import { ingestEnquiry } from '../enquiries/ingest';
import type { WsHub } from '../ws/hub';
import { requireAuth, type AuthedRequest } from './middleware';

interface EnquiryRow {
  id: string;
  company_id: string;
  contact_id: string | null;
  channel: string;
  status: string;
  subject: string | null;
  assigned_to: string | null;
  created_at: Date;
  updated_at: Date;
  contact_name?: string | null;
  sender_name?: string | null;
  sender_contact?: string | null;
}

interface MessageRow {
  id: string;
  enquiry_id: string;
  direction: string;
  sender_name: string | null;
  sender_contact: string | null;
  body: string;
  created_at: Date;
}

function toEnquiry(row: EnquiryRow) {
  return {
    id: row.id,
    contactId: row.contact_id,
    contactName: row.contact_name ?? null,
    senderName: row.sender_name ?? null,
    senderContact: row.sender_contact ?? null,
    channel: row.channel,
    status: row.status,
    subject: row.subject,
    assignedTo: row.assigned_to,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toMessage(row: MessageRow) {
  return {
    id: row.id,
    direction: row.direction,
    senderName: row.sender_name,
    senderContact: row.sender_contact,
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}

export function enquiriesRouter(pool: Pool, authProvider: AuthProvider, hub: WsHub): Router {
  const router = Router();

  // Public: the live cerdik.co contact form posts here. Not a logged-in CRM
  // user, so this is secret-header protected instead of JWT-authed.
  router.post('/webhook/website', async (req, res) => {
    const secret = req.header('X-Enquiry-Webhook-Secret');
    if (!config.enquiries.websiteWebhookSecret || secret !== config.enquiries.websiteWebhookSecret) {
      res.status(401).json({ error: 'Invalid or missing webhook secret' });
      return;
    }
    const { rows: companyRows } = await pool.query<{ id: string }>('SELECT id FROM companies LIMIT 1');
    const companyId = companyRows[0]?.id;
    if (!companyId) {
      res.status(500).json({ error: 'No company configured' });
      return;
    }
    const { name, email_or_phone, message } = req.body ?? {};
    if (typeof email_or_phone !== 'string' || !email_or_phone.trim() || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'email_or_phone and message are required' });
      return;
    }
    const enquiry = await ingestEnquiry(pool, companyId, hub, {
      channel: 'website',
      senderName: typeof name === 'string' && name.trim() ? name.trim() : undefined,
      senderContact: email_or_phone.trim(),
      body: message.trim(),
    });
    res.status(201).json({ ok: true, enquiryId: enquiry.id });
  });

  router.use(requireAuth(authProvider));

  router.get('/', async (req: AuthedRequest, res) => {
    const { companyId } = req.auth!;
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    const channel = typeof req.query.channel === 'string' ? req.query.channel : null;
    const conditions = ['enquiries.company_id = $1'];
    const params: unknown[] = [companyId];
    if (status) {
      params.push(status);
      conditions.push(`enquiries.status = $${params.length}`);
    }
    if (channel) {
      params.push(channel);
      conditions.push(`enquiries.channel = $${params.length}`);
    }
    const { rows } = await pool.query<EnquiryRow>(
      `SELECT enquiries.*, contacts.name AS contact_name,
              first_msg.sender_name, first_msg.sender_contact
       FROM enquiries
       LEFT JOIN contacts ON contacts.id = enquiries.contact_id
       LEFT JOIN LATERAL (
         SELECT sender_name, sender_contact FROM enquiry_messages
         WHERE enquiry_messages.enquiry_id = enquiries.id AND direction = 'inbound'
         ORDER BY created_at ASC LIMIT 1
       ) first_msg ON true
       WHERE ${conditions.join(' AND ')}
       ORDER BY enquiries.updated_at DESC LIMIT 200`,
      params,
    );
    res.json(rows.map(toEnquiry));
  });

  router.get('/:id', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    const { rows } = await pool.query<EnquiryRow>(
      `SELECT enquiries.*, contacts.name AS contact_name,
              first_msg.sender_name, first_msg.sender_contact
       FROM enquiries
       LEFT JOIN contacts ON contacts.id = enquiries.contact_id
       LEFT JOIN LATERAL (
         SELECT sender_name, sender_contact FROM enquiry_messages
         WHERE enquiry_messages.enquiry_id = enquiries.id AND direction = 'inbound'
         ORDER BY created_at ASC LIMIT 1
       ) first_msg ON true
       WHERE enquiries.id = $1 AND enquiries.company_id = $2`,
      [req.params.id, companyId],
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { rows: messages } = await pool.query<MessageRow>(
      `SELECT * FROM enquiry_messages WHERE enquiry_id = $1 ORDER BY created_at ASC`,
      [req.params.id],
    );
    await writeAuditLog(pool, { companyId, userId, action: 'enquiry.view', entityType: 'enquiry', entityId: req.params.id });
    res.json({ ...toEnquiry(rows[0]), messages: messages.map(toMessage) });
  });

  router.patch('/:id', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    const { status, assignedTo } = req.body ?? {};
    const { rows } = await pool.query<EnquiryRow>(
      `UPDATE enquiries SET
         status = COALESCE($1, status),
         assigned_to = COALESCE($2, assigned_to),
         updated_at = now()
       WHERE id = $3 AND company_id = $4
       RETURNING *, (SELECT name FROM contacts WHERE contacts.id = enquiries.contact_id) AS contact_name`,
      [typeof status === 'string' ? status : null, typeof assignedTo === 'string' ? assignedTo : null, req.params.id, companyId],
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await writeAuditLog(pool, { companyId, userId, action: 'enquiry.update', entityType: 'enquiry', entityId: req.params.id });
    res.json(toEnquiry(rows[0]));
  });

  // Phase 1 "reply": logs what the agent said and marks the enquiry handled.
  // Does not actually dispatch an email/WhatsApp message — that needs its
  // own provider setup and explicit approval.
  router.post('/:id/messages', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    const { body } = req.body ?? {};
    if (typeof body !== 'string' || !body.trim()) {
      res.status(400).json({ error: 'body is required' });
      return;
    }
    const { rows: enquiryRows } = await pool.query<EnquiryRow>(
      `SELECT * FROM enquiries WHERE id = $1 AND company_id = $2`,
      [req.params.id, companyId],
    );
    if (!enquiryRows[0]) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { rows: messageRows } = await pool.query<MessageRow>(
      `INSERT INTO enquiry_messages (enquiry_id, company_id, direction, body)
       VALUES ($1, $2, 'outbound', $3) RETURNING *`,
      [req.params.id, companyId, body.trim()],
    );
    await pool.query(`UPDATE enquiries SET status = 'handled', updated_at = now() WHERE id = $1`, [req.params.id]);
    await writeAuditLog(pool, { companyId, userId, action: 'enquiry.reply', entityType: 'enquiry', entityId: req.params.id });
    res.status(201).json(toMessage(messageRows[0]));
  });

  return router;
}
