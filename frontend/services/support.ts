import { identityHeaders } from './device';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

export type SupportStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

export interface SupportMessage {
  id: string;
  from: 'user' | 'admin';
  body: string;
  date: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  betRef?: string;
  status: SupportStatus;
  messages: SupportMessage[];
  createdDate: string;
  updatedDate: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(await identityHeaders()),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const b = await res.json(); if (b?.error) message = b.error; } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── User-facing ────────────────────────────────────────────────────────────────
export const fetchMyTickets = () => req<SupportTicket[]>('/api/support');

export const createTicket = (subject: string, body: string, betRef?: string) =>
  req<SupportTicket>('/api/support', { method: 'POST', body: JSON.stringify({ subject, body, betRef: betRef || '' }) });

export const replyToTicket = (id: string, body: string) =>
  req<SupportTicket>(`/api/support/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) });

// ── Admin ──────────────────────────────────────────────────────────────────────
async function adminReq<T>(path: string, init?: RequestInit): Promise<T> {
  return req<T>(path, init); // admin auth rides on the Firebase token in identityHeaders
}

export const fetchAllTickets = () => adminReq<SupportTicket[]>('/api/admin/support');
export const adminReplyTicket = (id: string, body: string) =>
  adminReq<SupportTicket>(`/api/admin/support/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) });
export const adminCloseTicket = (id: string) =>
  adminReq<SupportTicket>(`/api/admin/support/${id}/close`, { method: 'POST' });
