const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4100';

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
  user: { id: string; email: string; name: string; extension: string | null; companyId: string };
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

  callLog: () => request<CallRecord[]>('/api/calls'),
  missedCalls: () => request<MissedCallGroup[]>('/api/calls/missed'),
  dial: (target: string, extension: string) =>
    request<{ ok: true }>('/api/calls/dial', { method: 'POST', body: JSON.stringify({ target, extension }) }),
};
