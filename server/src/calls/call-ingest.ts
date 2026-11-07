import type { Pool } from 'pg';
import type { PbxConnector, PbxEvent } from '@cerdik-crm/shared';
import { isLikelyExtension, normalizePhone } from '@cerdik-crm/shared';
import type { WsHub } from '../ws/hub';
import { findContactByE164 } from '../contacts/lookup';

/** Bridges PBX events (via the connector) into: live WS pushes for the
 * agent screen (ringing pop, call ended) and persisted call/call_event
 * rows once a call's CDR arrives — the only point duration, disposition
 * and the recording filename are known (see docs/MQTT-API.md). */
export function startCallIngest(pool: Pool, companyId: string, connector: PbxConnector, hub: WsHub): void {
  connector.on('event', (evt: PbxEvent) => {
    void handleEvent(pool, companyId, connector, hub, evt).catch((err) => {
      console.error('[call-ingest] failed to handle event', evt.type, err);
    });
  });
}

async function handleEvent(pool: Pool, companyId: string, connector: PbxConnector, hub: WsHub, evt: PbxEvent): Promise<void> {
  if (evt.type === 'invite') {
    const callerSide = classify(evt.from);
    const calleeSide = classify(evt.to);
    const otherNumber = calleeSide.isExtension ? callerSide.normalized : calleeSide.normalized;
    const contact = otherNumber ? await findContactByE164(pool, companyId, otherNumber) : null;
    hub.broadcastToExtension(evt.to, {
      kind: 'ringing',
      callId: evt.callId,
      fromExtension: evt.from,
      toExtension: evt.to,
      otherNumber,
      contact,
    });
    return;
  }

  if (evt.type === 'cdr') {
    const srcSide = classify(evt.src);
    const dstSide = classify(evt.dst);
    const isInternal = evt.callType === 'Internal';
    const direction = isInternal ? 'internal' : dstSide.isExtension ? 'inbound' : 'outbound';
    const extension = isInternal ? evt.dst : dstSide.isExtension ? evt.dst : srcSide.isExtension ? evt.src : null;
    const fromE164 = srcSide.normalized ?? evt.src;
    const toE164 = dstSide.normalized ?? evt.dst;
    const otherE164 = direction === 'outbound' ? toE164 : fromE164;
    const contact = await findContactByE164(pool, companyId, otherE164);

    const startedAt = parsePbxTimestamp(evt.start) ?? new Date();
    const answeredAt = parsePbxTimestamp(evt.answer);
    const endedAt = parsePbxTimestamp(evt.end) ?? new Date();

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO calls (
         company_id, pbx_call_id, direction, from_e164, to_e164, extension, contact_id,
         started_at, answered_at, ended_at, duration_sec, disposition, recording_file
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (company_id, pbx_call_id) DO UPDATE SET
         ended_at = EXCLUDED.ended_at,
         duration_sec = EXCLUDED.duration_sec,
         disposition = EXCLUDED.disposition,
         recording_file = EXCLUDED.recording_file
       RETURNING id`,
      [
        companyId,
        evt.callId,
        direction,
        fromE164,
        toE164,
        extension,
        contact?.id ?? null,
        startedAt,
        answeredAt,
        endedAt,
        evt.billSec,
        evt.disposition === 'answered' ? 'answered' : 'missed',
        evt.recordingFile,
      ],
    );
    const callRowId = rows[0]?.id;
    if (callRowId) {
      await pool.query(
        `INSERT INTO call_events (company_id, call_id, event_type, payload) VALUES ($1, $2, 'ended', $3)`,
        [companyId, callRowId, JSON.stringify(evt)],
      );
    }

    if (extension) {
      hub.broadcastToExtension(extension, { kind: 'callEnded', callId: evt.callId });
    }
    void connector; // reserved for future phase-1.x use (e.g. re-querying live state on cdr)
  }
}

function classify(value: string): { isExtension: boolean; normalized: string | null } {
  if (isLikelyExtension(value)) return { isExtension: true, normalized: null };
  return { isExtension: false, normalized: normalizePhone(value) ?? value };
}

/** PBX timestamps are "YYYY-MM-DD HH:MM:SS" local time, no timezone — see
 * docs/MQTT-API.md's captured cdr payload. Empty string (e.g. `answer` on
 * a never-answered call) means "never happened". */
function parsePbxTimestamp(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
