import type { Pool } from 'pg';
import type { InboundEnquiryPayload } from '@cerdik-crm/shared';
import { normalizePhone } from '@cerdik-crm/shared';
import type { WsHub } from '../ws/hub';
import { findContactByE164 } from '../contacts/lookup';

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
}

/** Normalizes the sender, matches an existing contact by phone (an email
 * address just won't match — that's fine, it leaves contact_id null), opens
 * a new enquiry thread, appends the first message, and pushes the new
 * enquiry to every connected agent. */
export async function ingestEnquiry(pool: Pool, companyId: string, hub: WsHub, payload: InboundEnquiryPayload) {
  const e164 = normalizePhone(payload.senderContact);
  const contact = await findContactByE164(pool, companyId, e164);

  const { rows } = await pool.query<EnquiryRow>(
    `INSERT INTO enquiries (company_id, contact_id, channel, subject)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [companyId, contact?.id ?? null, payload.channel, payload.subject ?? null],
  );
  const enquiry = rows[0];

  await pool.query(
    `INSERT INTO enquiry_messages (enquiry_id, company_id, direction, sender_name, sender_contact, body)
     VALUES ($1, $2, 'inbound', $3, $4, $5)`,
    [enquiry.id, companyId, payload.senderName ?? null, payload.senderContact, payload.body],
  );

  hub.broadcastAll({
    kind: 'enquiryReceived',
    enquiryId: enquiry.id,
    channel: enquiry.channel,
    senderName: payload.senderName ?? null,
    contactId: contact?.id ?? null,
    contactName: contact?.name ?? null,
  });

  return enquiry;
}
