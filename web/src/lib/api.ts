// Empty string = relative to the page's own origin, which is correct when
// the server serves this built app itself (see server/src/index.ts). Set
// VITE_API_URL only when running the Vite dev server against a server on a
// different origin.
const API_URL = import.meta.env.VITE_API_URL ?? '';

export function getToken(): string | null {
  return localStorage.getItem('cerdik_token');
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem('cerdik_token', token);
  else localStorage.removeItem('cerdik_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface LoginResponse {
  token: string;
  user: { id: string; email: string; name: string; extension: string | null; companyId: string; isAdmin: boolean };
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  occurredAt: string;
  ipAddress: string | null;
}

export interface ContactPhone {
  id: string;
  e164: string;
  label: string | null;
}

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  notes: string | null;
  phones: ContactPhone[];
}

export interface CallRecord {
  id: string;
  pbxCallId: string;
  direction: string;
  fromE164: string;
  toE164: string;
  extension: string | null;
  contactId: string | null;
  contactName: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number;
  disposition: string;
  recordingFile: string | null;
  outcome: string | null;
  notes: string | null;
}

export interface EnquiryMessage {
  id: string;
  direction: string;
  senderName: string | null;
  senderContact: string | null;
  body: string;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  contactId: string | null;
  contactName: string | null;
  senderName: string | null;
  senderContact: string | null;
  channel: string;
  status: string;
  subject: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryDetail extends Enquiry {
  messages: EnquiryMessage[];
}

export interface MissedCallGroup {
  fromE164: string;
  contactId: string | null;
  contactName: string | null;
  count: number;
  lastAt: string;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  setExtension: (extension: string) =>
    request<{ ok: true; token: string }>('/api/auth/extension', {
      method: 'POST',
      body: JSON.stringify({ extension }),
    }),

  extensions: () => request<Array<{ extension: string; name: string }>>('/api/extensions'),

  contacts: (search?: string) =>
    request<Contact[]>(`/api/contacts${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  contactByPhone: (raw: string) =>
    request<{ contact: Contact | null; e164: string }>(`/api/contacts/by-phone/${encodeURIComponent(raw)}`),
  createContact: (data: { name: string; company?: string; notes?: string; phones: Array<{ raw: string; label?: string }> }) =>
    request<Contact>('/api/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id: string, data: { name?: string; company?: string; notes?: string }) =>
    request<Contact>(`/api/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  contact: (id: string) => request<Contact>(`/api/contacts/${id}`),

  callLog: (contactId?: string) =>
    request<CallRecord[]>(`/api/calls${contactId ? `?contactId=${encodeURIComponent(contactId)}` : ''}`),
  missedCalls: () => request<MissedCallGroup[]>('/api/calls/missed'),
  dial: (target: string, extension: string) =>
    request<{ ok: true }>('/api/calls/dial', { method: 'POST', body: JSON.stringify({ target, extension }) }),
  annotateCall: (id: string, data: { outcome?: string; notes?: string }) =>
    request<CallRecord>(`/api/calls/${id}/notes`, { method: 'PATCH', body: JSON.stringify(data) }),

  auditLog: () => request<AuditLogEntry[]>('/api/audit-log'),

  reportsSummary: () =>
    request<{
      from: string;
      to: string;
      totalCalls: number;
      answeredCalls: number;
      answerRate: number;
      avgHandleSec: number;
      daily: Array<{ day: string; total: number; missed: number }>;
    }>('/api/reports/summary'),

  enquiries: (filters?: { status?: string; channel?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.channel) params.set('channel', filters.channel);
    const qs = params.toString();
    return request<Enquiry[]>(`/api/enquiries${qs ? `?${qs}` : ''}`);
  },
  enquiry: (id: string) => request<EnquiryDetail>(`/api/enquiries/${id}`),
  updateEnquiry: (id: string, data: { status?: string; assignedTo?: string }) =>
    request<Enquiry>(`/api/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  replyToEnquiry: (id: string, body: string) =>
    request<EnquiryMessage>(`/api/enquiries/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
};
