const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

// Risk limits (USD cents) served by the backend so the UI shows accurate hints.
export interface AppLimits {
  minBet: number;
  maxBet: number;
  minWithdrawal: number;
  maxWithdrawal: number;
}

const DEFAULTS: AppLimits = { minBet: 50, maxBet: 100000, minWithdrawal: 500, maxWithdrawal: 1000000 };

let cache: AppLimits | null = null;

export async function fetchLimits(): Promise<AppLimits> {
  if (cache) return cache;
  try {
    const r = await fetch(`${API_BASE_URL}/api/config`);
    if (r.ok) { cache = await r.json(); return cache!; }
  } catch { /* fall through to defaults */ }
  return DEFAULTS;
}

export function cachedLimits(): AppLimits {
  return cache ?? DEFAULTS;
}

export const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
