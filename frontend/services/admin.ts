const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';
const KEY_STORE = 'raphbet.adminKey';

export const getAdminKey = () => sessionStorage.getItem(KEY_STORE) || '';
export const setAdminKey = (k: string) => sessionStorage.setItem(KEY_STORE, k);
export const clearAdminKey = () => sessionStorage.removeItem(KEY_STORE);

export interface AdminStats {
  users: number;
  totalBalance: number;
  totalStaked: number;
  totalPayouts: number;
  ggr: number;
  deposits: number;
  withdrawals: number;
  betsPending: number;
  betsWon: number;
  betsLost: number;
}

export interface AdminUser {
  deviceId: string;
  balance: number;
  verified: boolean;
  totalStaked: number;
  bets: number;
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

async function adminGet<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { 'X-Admin-Key': key } });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  return res.json() as Promise<T>;
}

async function adminPost<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: { 'X-Admin-Key': key } });
  if (!res.ok) throw new Error(`request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const fetchAdminStats = (key: string) => adminGet<AdminStats>('/api/admin/stats', key);
export const fetchAdminUsers = (key: string) => adminGet<AdminUser[]>('/api/admin/users', key);
export const fetchAdminBets = (key: string) => adminGet<AdminBet[]>('/api/admin/bets', key);
export const fetchAdminWithdrawals = (key: string) => adminGet<AdminWithdrawal[]>('/api/admin/withdrawals', key);
export const approveWithdrawal = (key: string, id: string) => adminPost(`/api/admin/withdrawals/${id}/approve`, key);
export const rejectWithdrawal = (key: string, id: string) => adminPost(`/api/admin/withdrawals/${id}/reject`, key);
