import { Router } from 'express';
import type { Pool } from 'pg';
import { normalizePhone } from '@cerdik-crm/shared';
import { writeAuditLog } from '../audit';
import { requireAuth, type AuthedRequest } from './middleware';
import type { AuthProvider } from '@cerdik-crm/shared';

interface ContactRow {
  id: string;
  company_id: string;
  name: string;
  company: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface PhoneRow {
  id: string;
  contact_id: string;
  e164: string;
  label: string | null;
}

function toContact(row: ContactRow, phones: PhoneRow[]) {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    company: row.company,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    phones: phones.map((p) => ({ id: p.id, e164: p.e164, label: p.label })),
  };
}

export function contactsRouter(pool: Pool, authProvider: AuthProvider): Router {
  const router = Router();
  router.use(requireAuth(authProvider));

  router.get('/', async (req: AuthedRequest, res) => {
    const { companyId } = req.auth!;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const { rows } = await pool.query<ContactRow>(
      search
        ? `SELECT * FROM contacts WHERE company_id = $1 AND name ILIKE $2 ORDER BY name LIMIT 100`
        : `SELECT * FROM contacts WHERE company_id = $1 ORDER BY name LIMIT 100`,
      search ? [companyId, `%${search}%`] : [companyId],
    );
    res.json(rows.map((row) => toContact(row, [])));
  });

  router.get('/by-phone/:raw', async (req: AuthedRequest, res) => {
    const { companyId } = req.auth!;
    const e164 = normalizePhone(req.params.raw);
    if (!e164) {
      res.status(400).json({ error: 'Not a recognizable phone number', raw: req.params.raw });
      return;
    }
    const { rows: phoneRows } = await pool.query<PhoneRow>(
      `SELECT * FROM contact_phones WHERE company_id = $1 AND e164 = $2 LIMIT 1`,
      [companyId, e164],
    );
    if (phoneRows.length === 0) {
      res.json({ contact: null, e164 });
      return;
    }
    const { rows: contactRows } = await pool.query<ContactRow>(`SELECT * FROM contacts WHERE id = $1`, [
      phoneRows[0].contact_id,
    ]);
    const { rows: allPhones } = await pool.query<PhoneRow>(`SELECT * FROM contact_phones WHERE contact_id = $1`, [
      phoneRows[0].contact_id,
    ]);
    res.json({ contact: contactRows[0] ? toContact(contactRows[0], allPhones) : null, e164 });
  });

  router.get('/:id', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    const { rows } = await pool.query<ContactRow>(`SELECT * FROM contacts WHERE id = $1 AND company_id = $2`, [
      req.params.id,
      companyId,
    ]);
    if (!rows[0]) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { rows: phones } = await pool.query<PhoneRow>(`SELECT * FROM contact_phones WHERE contact_id = $1`, [
      req.params.id,
    ]);
    await writeAuditLog(pool, {
      companyId,
      userId,
      action: 'contact.view',
      entityType: 'contact',
      entityId: req.params.id,
    });
    res.json(toContact(rows[0], phones));
  });

  router.post('/', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    const { name, company, notes, phones } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<ContactRow>(
        `INSERT INTO contacts (company_id, name, company, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
        [companyId, name.trim(), company ?? null, notes ?? null],
      );
      const contact = rows[0];
      const phoneRows: PhoneRow[] = [];
      for (const phone of Array.isArray(phones) ? phones : []) {
        const e164 = normalizePhone(String(phone.raw ?? phone.e164 ?? ''));
        if (!e164) continue;
        const { rows: inserted } = await client.query<PhoneRow>(
          `INSERT INTO contact_phones (contact_id, company_id, e164, label) VALUES ($1, $2, $3, $4) RETURNING *`,
          [contact.id, companyId, e164, phone.label ?? null],
        );
        phoneRows.push(inserted[0]);
      }
      await client.query('COMMIT');
      await writeAuditLog(pool, { companyId, userId, action: 'contact.create', entityType: 'contact', entityId: contact.id });
      res.status(201).json(toContact(contact, phoneRows));
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create contact' });
    } finally {
      client.release();
    }
  });

  router.patch('/:id', async (req: AuthedRequest, res) => {
    const { companyId, userId } = req.auth!;
    const { name, company, notes } = req.body ?? {};
    const { rows } = await pool.query<ContactRow>(
      `UPDATE contacts SET
         name = COALESCE($1, name),
         company = COALESCE($2, company),
         notes = COALESCE($3, notes),
         updated_at = now()
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [name ?? null, company ?? null, notes ?? null, req.params.id, companyId],
    );
    if (!rows[0]) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await writeAuditLog(pool, { companyId, userId, action: 'contact.edit', entityType: 'contact', entityId: req.params.id });
    const { rows: phones } = await pool.query<PhoneRow>(`SELECT * FROM contact_phones WHERE contact_id = $1`, [
      req.params.id,
    ]);
    res.json(toContact(rows[0], phones));
  });

  return router;
}
