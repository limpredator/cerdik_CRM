export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Role {
  id: string;
  companyId: string;
  name: string;
}

export interface User {
  id: string;
  companyId: string;
  roleId: string;
  email: string;
  name: string;
  extension: string | null;
  createdAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  company: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactPhone {
  id: string;
  contactId: string;
  companyId: string;
  /** Always E.164, e.g. +60387654321 — see phone.ts normalizePhone(). */
  e164: string;
  label: string | null;
}

export type CallDirection = 'inbound' | 'outbound' | 'internal';
export type CallDisposition = 'answered' | 'missed' | 'no-answer' | 'busy' | 'failed';

export interface CallRecord {
  id: string;
  companyId: string;
  pbxCallId: string;
  direction: CallDirection;
  fromE164: string;
  toE164: string;
  extension: string | null;
  contactId: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number;
  disposition: CallDisposition;
  recordingFile: string | null;
}

export type CallEventType = 'invite' | 'ringing' | 'answered' | 'ended';

export interface CallEventRecord {
  id: string;
  companyId: string;
  callId: string;
  eventType: CallEventType;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  occurredAt: string;
  ipAddress: string | null;
}
