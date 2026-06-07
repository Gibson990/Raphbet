import { getDeviceId } from './device';
import type { PlacedBet, Transaction, BetSelection } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

export interface WalletDTO {
  balance: number;
  transactions: Transaction[];
}

export interface PlaceItem {
  selection: BetSelection;
  wager: number;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': getDeviceId(),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const fetchWallet = () => req<WalletDTO>('/api/wallet');
export const fetchBets = () => req<PlacedBet[]>('/api/bets');

export const topUp = (amount: number, method: string) =>
  req<WalletDTO>('/api/wallet/topup', { method: 'POST', body: JSON.stringify({ amount, method }) });

export const withdraw = (amount: number, method: string) =>
  req<WalletDTO>('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, method }) });

export const placeBets = (items: PlaceItem[]) =>
  req<{ bets: PlacedBet[]; wallet: WalletDTO }>('/api/bets', { method: 'POST', body: JSON.stringify({ items }) });
