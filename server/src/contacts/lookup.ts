import type { Pool } from 'pg';

/** Shared by call-ingest and enquiry-ingest — both need "does an E.164
 * number already belong to a known contact" and nothing more. */
export async function findContactByE164(
  pool: Pool,
  companyId: string,
  e164: string | null,
): Promise<{ id: string; name: string } | null> {
  if (!e164) return null;
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT contacts.id, contacts.name FROM contact_phones
     JOIN contacts ON contacts.id = contact_phones.contact_id
     WHERE contact_phones.company_id = $1 AND contact_phones.e164 = $2 LIMIT 1`,
    [companyId, e164],
  );
  return rows[0] ?? null;
}
