import { getDeviceId } from './device';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId(), ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`KYC request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const fetchKycStatus = () => req<{ verified: boolean }>('/api/kyc/status');

/** Begin verification. Returns a hosted URL to redirect to, or verified=true
 *  when already verified or the sandbox approves instantly. */
export const startKyc = () => req<{ url: string; verified: boolean }>('/api/kyc/start', { method: 'POST' });

/** Poll the provider for the latest decision (used on return from the hosted flow). */
export const checkKyc = () => req<{ verified: boolean }>('/api/kyc/check', { method: 'POST' });
