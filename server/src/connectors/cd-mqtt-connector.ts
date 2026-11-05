import mqtt, { type MqttClient } from 'mqtt';
import type { PbxConnector, PbxEvent, PbxCallStatusItem } from '@cerdik-crm/shared';

/**
 * Connector for Cerdik's CD-series PBX, speaking its proprietary MQTT API.
 * Schema and quirks are documented in docs/MQTT-API.md (carried over from
 * the Console repo's own capture notes) — in short:
 *   - The PBX is an MQTT *client* that connects OUT to a broker we host.
 *     All its topics live under `device/<serial>/api/v1.0/`.
 *   - `command/<category>` is a grouping, not the action — the action is
 *     the `cmd` field inside the JSON body. Every response comes back on
 *     the shared `.../response` topic, correlated by `request_id`.
 *   - There is no `answer` command — calls are answered on the phone
 *     itself, never through this API.
 *   - The CDR's recording filename field is `recordfile` (frequently empty
 *     when no recording was made), NOT `recording` — that name is used
 *     instead on `callstatus`'s per-call rows, for an unrelated boolean.
 *
 * This is a fresh, minimal implementation for the CRM's phase-1 needs
 * (contact popping, click-to-dial, call log, missed calls) — it does not
 * carry over the Console project's hold/transfer/queue state machine.
 */
export class CdMqttConnector implements PbxConnector {
  readonly name = 'Cerdik CD-series (MQTT)';

  private client: MqttClient | null = null;
  private connected = false;
  private handlers = new Set<(evt: PbxEvent) => void>();
  private pendingCommands = new Map<
    string,
    { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }
  >();

  constructor(
    private readonly opts: {
      brokerUrl: string;
      username?: string;
      password?: string;
      deviceSerial: string;
    },
  ) {}

  private get topicRoot(): string {
    if (!this.opts.deviceSerial) {
      throw new Error('MQTT_DEVICE_SERIAL is not set — see .env.example');
    }
    return `device/${this.opts.deviceSerial}/api/v1.0`;
  }

  async connect(): Promise<void> {
    this.client = mqtt.connect(this.opts.brokerUrl, {
      username: this.opts.username,
      password: this.opts.password,
      reconnectPeriod: 5000,
    });

    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        this.connected = true;
        this.client!.subscribe(`${this.topicRoot}/#`);
        this.client!.off('error', onError);
        resolve();
      };
      const onError = (err: Error) => {
        this.client!.off('connect', onConnect);
        reject(err);
      };
      this.client!.once('connect', onConnect);
      this.client!.once('error', onError);
    });

    this.client.on('close', () => {
      this.connected = false;
    });

    this.client.on('message', (topic, payload) => {
      try {
        this.handleMessage(topic, payload.toString());
      } catch (err) {
        console.error('[cd-mqtt] failed to handle message on', topic, err);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await new Promise<void>((resolve) => this.client?.end(false, {}, () => resolve()));
    this.client = null;
  }

  isConnected(): boolean {
    return this.connected;
  }

  on(_event: 'event', handler: (evt: PbxEvent) => void): void {
    this.handlers.add(handler);
  }

  off(_event: 'event', handler: (evt: PbxEvent) => void): void {
    this.handlers.delete(handler);
  }

  private emit(evt: PbxEvent): void {
    for (const handler of this.handlers) handler(evt);
  }

  // ------------------------------------------------------------- intake

  private handleMessage(topic: string, raw: string): void {
    const suffix = topic.slice(this.topicRoot.length + 1);
    if (suffix === 'status') return; // retained heartbeat only
    if (suffix === 'cdr') {
      this.emit(parseCdrPayload(JSON.parse(raw)));
      return;
    }
    if (suffix === 'event') {
      const evt = parseEventPayload(JSON.parse(raw));
      if (evt) this.emit(evt);
      return;
    }
    if (suffix === 'response') {
      this.handleResponse(JSON.parse(raw));
      return;
    }
  }

  private handleResponse(resp: Record<string, unknown>): void {
    const requestId = typeof resp.request_id === 'string' ? resp.request_id : undefined;
    const pending = requestId ? this.pendingCommands.get(requestId) : undefined;
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingCommands.delete(requestId!);
    if (resp.status === 'Success') {
      pending.resolve(resp);
    } else {
      pending.reject(new Error(String(resp.message ?? `PBX rejected command (status: ${resp.status})`)));
    }
  }

  // ------------------------------------------------------------ commands

  private sendCommand(
    category: string,
    payload: Record<string, unknown>,
    timeoutMs = 5000,
  ): Promise<Record<string, unknown>> {
    if (!this.client || !this.connected) {
      return Promise.reject(new Error('MQTT connector is not connected to the PBX'));
    }
    const request_id = `crm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const body = JSON.stringify({ request_id, ...payload });
    const client = this.client;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(request_id);
        reject(new Error(`PBX did not respond to "${payload.cmd}" within ${timeoutMs}ms`));
      }, timeoutMs);
      this.pendingCommands.set(request_id, { resolve, reject, timer });
      client.publish(`${this.topicRoot}/command/${category}`, body, (err) => {
        if (err) {
          clearTimeout(timer);
          this.pendingCommands.delete(request_id);
          reject(err);
        }
      });
    });
  }

  async dial(caller: string, callee: string): Promise<void> {
    await this.sendCommand('call', { cmd: 'dial', caller, callee, autoanswer: 'yes' });
  }

  async hangup(callIdOrChannelId: string): Promise<void> {
    await this.sendCommand('call', { cmd: 'hangup', channelid: callIdOrChannelId });
  }

  async blindTransfer(channelId: string, toNumber: string): Promise<void> {
    await this.sendCommand('call', { cmd: 'blindtransfer', channelid: channelId, tonumber: toNumber });
  }

  async atxfer(channelId: string, toNumber: string): Promise<void> {
    await this.sendCommand('call', { cmd: 'atxfer', channelid: channelId, tonumber: toNumber });
  }

  async musicOnHold(channelId: string, on: boolean): Promise<void> {
    await this.sendCommand('call', { cmd: 'musiconhold', channelid: channelId, state: on ? 'yes' : 'no' });
  }

  async mute(channelId: string, on: boolean): Promise<void> {
    await this.sendCommand('call', { cmd: 'mute', channelid: channelId, state: on ? 'yes' : 'no' });
  }

  async callPark(channelId: string, parkingSlot?: number): Promise<void> {
    await this.sendCommand('call', {
      cmd: 'callpark',
      channelid: channelId,
      ...(parkingSlot ? { parkingslot: parkingSlot } : {}),
    });
  }

  async extensionList(): Promise<Array<{ extension: string; name: string }>> {
    const resp = await this.sendCommand('system', { cmd: 'extension_list' });
    const rows = Array.isArray(resp.extlist) ? (resp.extlist as Record<string, unknown>[]) : [];
    // The manual names this field `username`; every unit tested in the
    // Console project returned it under `fullname` instead — see
    // docs/MQTT-API.md. Read `fullname` first, fall back to `username`.
    return rows.map((row) => ({
      extension: String(row.number ?? ''),
      name: String(row.fullname ?? row.username ?? row.number ?? ''),
    }));
  }

  async queueList(): Promise<Array<{ id: string; name: string }>> {
    const resp = await this.sendCommand('queue', { cmd: 'queue_list' });
    const rows = Array.isArray(resp.queuelist) ? (resp.queuelist as Record<string, unknown>[]) : [];
    return rows.map((row) => ({ id: String(row.number ?? ''), name: String(row.name ?? row.number ?? '') }));
  }

  async queueStatus(queueId: string): Promise<unknown> {
    return this.sendCommand('queue', { cmd: 'queue_status', queue: queueId });
  }
}

// ------------------------------------------------------------ parsing

/** Exported for unit tests — see server/src/__tests__/cd-mqtt-parsing.test.ts. */
export function parseEventPayload(raw: Record<string, unknown>): PbxEvent | null {
  switch (raw.event) {
    case 'extension_status':
      return {
        type: 'extensionStatus',
        extension: String(raw.extension ?? ''),
        status: String(raw.status ?? ''),
      };
    case 'invite':
      return {
        type: 'invite',
        from: String(raw.from ?? ''),
        to: String(raw.to ?? ''),
        callId: String(raw.callid ?? ''),
      };
    case 'callstatus': {
      const calllist = Array.isArray(raw.calllist) ? (raw.calllist as Record<string, unknown>[]) : [];
      const calls: PbxCallStatusItem[] = calllist.map((item) => ({
        callId: String(item.callid ?? ''),
        caller: String(item.caller ?? ''),
        called: String(item.called ?? ''),
        state: String(item.state ?? ''),
        callType: String(item.calltype ?? ''),
      }));
      return { type: 'callStatus', calls };
    }
    default:
      return null;
  }
}

/** Exported for unit tests. */
export function parseCdrPayload(raw: Record<string, unknown>): import('@cerdik-crm/shared').PbxCdrEvent {
  const disposition = String(raw.disposition ?? '').toUpperCase();
  return {
    type: 'cdr',
    callId: String(raw.callid ?? ''),
    src: String(raw.src ?? ''),
    dst: String(raw.dst ?? ''),
    start: String(raw.start ?? ''),
    answer: raw.answer ? String(raw.answer) : null,
    end: String(raw.end ?? ''),
    billSec: Number(raw.billsec ?? 0) || 0,
    disposition:
      disposition === 'ANSWERED'
        ? 'answered'
        : disposition === 'BUSY'
          ? 'busy'
          : disposition === 'FAILED'
            ? 'failed'
            : 'no-answer',
    callType: String(raw.calltype ?? ''),
    // Field is `recordfile`, not `recording` — see docs/MQTT-API.md.
    recordingFile: raw.recordfile ? String(raw.recordfile) : null,
  };
}
