import { identityHeaders } from './device';
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
      ...(await identityHeaders()),
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

// Top-up result: synchronous providers credit immediately (wallet); async ones
// (crypto) return a hosted checkout URL to redirect to.
export type TopUpResult = { kind: 'wallet'; wallet: WalletDTO } | { kind: 'redirect'; url: string };

export async function topUp(amount: number, method: string): Promise<TopUpResult> {
  const res = await fetch(`${API_BASE_URL}/api/wallet/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await identityHeaders()) },
    body: JSON.stringify({ amount, method }),
  });
  if (!res.ok) {
    let message = `Top up failed (${res.status})`;
    try { const b = await res.json(); if (b?.error) message = b.error; } catch { /* ignore */ }
    throw new Error(message);
  }
  const data = await res.json();
  if (data && data.checkoutUrl) return { kind: 'redirect', url: data.checkoutUrl };
  return { kind: 'wallet', wallet: data as WalletDTO };
}

export interface Withdrawal {
  id: string;
  amount: number;
  address: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  createdDate: string;
}

export const requestWithdrawal = (amount: number, address: string) =>
  req<Withdrawal>('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, address }) });

export const placeBets = (items: PlaceItem[]) =>
  req<{ bets: PlacedBet[]; wallet: WalletDTO }>('/api/bets', { method: 'POST', body: JSON.stringify({ items }) });

export const placeMultiBet = (selections: BetSelection[], wager: number) =>
  req<{ bets: PlacedBet[]; wallet: WalletDTO }>('/api/bets', { method: 'POST', body: JSON.stringify({ isMulti: true, selections, wager }) });

