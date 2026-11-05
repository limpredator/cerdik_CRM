import { describe, expect, it } from 'vitest';
import { parseCdrPayload, parseEventPayload } from '../connectors/cd-mqtt-connector';

/**
 * Fixtures below are real MQTT payloads captured live from a CD-series PBX
 * (serial TK11202505001962) — carried over verbatim from
 * github.com/<console-repo>/docs/MQTT-API.md, not synthesized, per the
 * phase-1 spec's requirement to test against real captured traffic.
 */

describe('parseEventPayload', () => {
  it('parses extension_status', () => {
    const raw = JSON.parse(
      '{"event":"extension_status","extension":"205","type":"SIP","ipaddr":"sip:205@192.168.100.239:5060","status":"Ringing"}',
    );
    expect(parseEventPayload(raw)).toEqual({
      type: 'extensionStatus',
      extension: '205',
      status: 'Ringing',
    });
  });

  it('parses invite', () => {
    const raw = JSON.parse('{"event":"invite","from":"204","to":"205","callid":"1789028588.967"}');
    expect(parseEventPayload(raw)).toEqual({
      type: 'invite',
      from: '204',
      to: '205',
      callId: '1789028588.967',
    });
  });

  it('parses callstatus with one ringing internal call', () => {
    const raw = JSON.parse(
      '{"calllist":[{"caller":"204","source":"SIP/204","called":"205","destination":"SIP/205","duration":"00:00:00","state":"Ring","calltype":"Internal","callid":"1789028588.967","recording":"no"}],"event":"callstatus"}',
    );
    expect(parseEventPayload(raw)).toEqual({
      type: 'callStatus',
      calls: [
        {
          callId: '1789028588.967',
          caller: '204',
          called: '205',
          state: 'Ring',
          callType: 'Internal',
        },
      ],
    });
  });

  it('parses an empty callstatus (no calls in progress)', () => {
    const raw = JSON.parse('{"calllist":[],"event":"callstatus"}');
    expect(parseEventPayload(raw)).toEqual({ type: 'callStatus', calls: [] });
  });

  it('returns null for an unrecognized event type', () => {
    expect(parseEventPayload({ event: 'something_new' })).toBeNull();
  });
});

describe('parseCdrPayload', () => {
  it('parses an answered internal call cdr', () => {
    const raw = JSON.parse(
      '{"event":"cdr","callid":"1789028588.967","src":"204","srctech":"SIP/204","dst":"205","dsttech":"SIP/205","start":"2026-09-10 16:23:08","answer":"2026-09-10 16:23:13","end":"2026-09-10 16:23:17","billsec":"3","disposition":"ANSWERED","direction":"Internal","calltype":"Internal","dtmf":"","recordfile":""}',
    );
    expect(parseCdrPayload(raw)).toEqual({
      type: 'cdr',
      callId: '1789028588.967',
      src: '204',
      dst: '205',
      start: '2026-09-10 16:23:08',
      answer: '2026-09-10 16:23:13',
      end: '2026-09-10 16:23:17',
      billSec: 3,
      disposition: 'answered',
      callType: 'Internal',
      recordingFile: null,
    });
  });

  it('treats an empty recordfile string as no recording, not an empty filename', () => {
    const raw = JSON.parse(
      '{"event":"cdr","callid":"x","src":"204","dst":"205","start":"2026-09-10 16:23:08","answer":"","end":"2026-09-10 16:23:17","billsec":"0","disposition":"NO ANSWER","calltype":"Internal","recordfile":""}',
    );
    const parsed = parseCdrPayload(raw);
    expect(parsed.recordingFile).toBeNull();
    expect(parsed.answer).toBeNull();
    expect(parsed.disposition).toBe('no-answer');
  });

  it('carries through a real recording filename when one exists', () => {
    const raw = JSON.parse(
      '{"event":"cdr","callid":"x","src":"204","dst":"60387654321","start":"2026-09-10 16:23:08","answer":"2026-09-10 16:23:09","end":"2026-09-10 16:24:00","billsec":"51","disposition":"ANSWERED","calltype":"Outgoing","recordfile":"202609101623-204-60387654321.wav"}',
    );
    expect(parseCdrPayload(raw).recordingFile).toBe('202609101623-204-60387654321.wav');
  });
});
