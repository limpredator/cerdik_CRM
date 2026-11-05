/**
 * Plugin boundary between the CRM and any PBX brand. A connector turns PBX
 * wire events into these typed events, and turns these commands into
 * whatever the PBX actually speaks (MQTT, AMI, HTTP, ...). The CD-series
 * connector is the first implementation; a second brand only ever needs a
 * second class implementing this same interface.
 */

export interface PbxInviteEvent {
  type: 'invite';
  from: string;
  to: string;
  callId: string;
}

export interface PbxExtensionStatusEvent {
  type: 'extensionStatus';
  extension: string;
  status: string;
}

export interface PbxCallStatusItem {
  callId: string;
  caller: string;
  called: string;
  state: string;
  callType: string;
}

export interface PbxCallStatusEvent {
  type: 'callStatus';
  calls: PbxCallStatusItem[];
}

/** Full record at call end — the only point the CRM learns duration,
 * disposition and the recording filename for a call. */
export interface PbxCdrEvent {
  type: 'cdr';
  callId: string;
  src: string;
  dst: string;
  start: string;
  answer: string | null;
  end: string;
  billSec: number;
  disposition: 'answered' | 'no-answer' | 'busy' | 'failed';
  callType: string;
  recordingFile: string | null;
}

export type PbxEvent =
  | PbxInviteEvent
  | PbxExtensionStatusEvent
  | PbxCallStatusEvent
  | PbxCdrEvent;

export interface PbxConnector {
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  on(event: 'event', handler: (evt: PbxEvent) => void): void;
  off(event: 'event', handler: (evt: PbxEvent) => void): void;

  dial(caller: string, callee: string): Promise<void>;
  hangup(callIdOrChannelId: string): Promise<void>;
  blindTransfer(channelId: string, toNumber: string): Promise<void>;
  atxfer(channelId: string, toNumber: string): Promise<void>;
  musicOnHold(channelId: string, on: boolean): Promise<void>;
  mute(channelId: string, on: boolean): Promise<void>;
  callPark(channelId: string, parkingSlot?: number): Promise<void>;
  extensionList(): Promise<Array<{ extension: string; name: string }>>;
  queueList(): Promise<Array<{ id: string; name: string }>>;
  queueStatus(queueId: string): Promise<unknown>;
}
