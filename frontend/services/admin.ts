import { identityHeaders } from './device';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

// Legacy key store – kept for backward compat but Firebase token auth is primary
const KEY_STORE = 'raphbet.adminKey';
export const getAdminKey = () => sessionStorage.getItem(KEY_STORE) || '';
export const setAdminKey = (k: string) => sessionStorage.setItem(KEY_STORE, k);
export const clearAdminKey = () => sessionStorage.removeItem(KEY_STORE);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyStat {
  date: string;
  wagers: number;
  payouts: number;
  ggr: number;
  deposits: number;
}

export interface AdminStats {
  users: number;
  totalBalance: number;
  totalStaked: number;
  totalPayouts: number;
  ggr: number;
  deposits: number;
  withdrawals: number;
  pendingLiability: number;
  betsPending: number;
  betsWon: number;
  betsLost: number;
  daily?: DailyStat[];
}

export interface AdminUser {
  deviceId: string;
  email?: string;
  balance: number;
  verified: boolean;
  totalStaked: number;
  bets: number;
  suspended: boolean;
}

export interface AdminBet {
  id: string;
  deviceId: string;
  match: string;
  market: string;
  wager: number;
  odds: number;
  status: 'PENDING' | 'WON' | 'LOST';
  payout: number;
  placedDate: string;
}

export interface AdminWithdrawal {
  id: string;
  amount: number;
  address: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  createdDate: string;
}

export interface AdminConfig {
  houseMargin: number;
  minBet: number;
  maxBet: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  maxLiability: number;
}

export interface WalletTransaction {
  id: string;
  type: 'Wager' | 'Payout' | 'Top-up' | 'Withdrawal';
  amount: number;
  description: string;
  date: string;
}

export interface AdminUserWallet {
  balance: number;
  suspended: boolean;
  transactions: WalletTransaction[];
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function adminGet<T>(path: string, key: string): Promise<T> {
  const headers: Record<string, string> = { ...(await identityHeaders()) };
  if (key) headers['X-Admin-Key'] = key;
  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  return res.json() as Promise<T>;
}

async function adminPost<T>(path: string, key: string, body?: any): Promise<T> {
  const headers: Record<string, string> = { ...(await identityHeaders()) };
  if (key) headers['X-Admin-Key'] = key;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  return res.json() as Promise<T>;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const fetchAdminStats = (key: string) => adminGet<AdminStats>('/api/admin/stats', key);
export const fetchAdminUsers = (key: string) => adminGet<AdminUser[]>('/api/admin/users', key);
export const fetchAdminBets = (key: string) => adminGet<AdminBet[]>('/api/admin/bets', key);
export const fetchAdminWithdrawals = (key: string) => adminGet<AdminWithdrawal[]>('/api/admin/withdrawals', key);

export const approveWithdrawal = (key: string, id: string) =>
  adminPost<unknown>(`/api/admin/withdrawals/${id}/approve`, key);
export const rejectWithdrawal = (key: string, id: string) =>
  adminPost<unknown>(`/api/admin/withdrawals/${id}/reject`, key);

// Returns the full wallet (balance + transactions) after adjustment
export const adjustUserBalance = (key: string, deviceId: string, amount: number, description: string) =>
  adminPost<AdminUserWallet>(`/api/admin/users/${deviceId}/balance`, key, { amount, description });

export const setUserKyc = (key: string, deviceId: string, verified: boolean) =>
  adminPost<{ verified: boolean }>(`/api/admin/users/${deviceId}/kyc`, key, { verified });

// Returns updated wallet (includes suspended flag)
export const setUserSuspended = (key: string, deviceId: string, suspended: boolean) =>
  adminPost<AdminUserWallet>(`/api/admin/users/${deviceId}/suspend`, key, { suspended });

export const fetchAdminConfig = (key: string) => adminGet<AdminConfig>('/api/admin/config', key);
export const saveAdminConfig = (key: string, config: Partial<AdminConfig>) =>
  adminPost<AdminConfig>('/api/admin/config', key, config);

// Returns the full wallet for a specific user (admin view)
export const fetchUserWallet = (key: string, deviceId: string) =>
  adminGet<AdminUserWallet>(`/api/admin/users/${deviceId}/wallet`, key);

// Manually settle a pending bet (WON or LOST)
export const settleBet = (key: string, betId: string, outcome: 'WON' | 'LOST') =>
  adminPost<AdminBet>(`/api/admin/bets/${betId}/settle`, key, { outcome });
