import { useState, useCallback, useEffect } from 'react';
import type { Bet, BetSelection, PlacedBet, Transaction } from '../types';
import { fetchWallet, fetchBets, topUp, requestWithdrawal, placeBets } from '../services/wallet';

type Result = { success: boolean; message: string; redirectUrl?: string };

const sortBets = (bets: PlacedBet[]): PlacedBet[] =>
  [...bets].sort((a, b) => new Date(b.placedDate).getTime() - new Date(a.placedDate).getTime());

/**
 * Backend-backed wallet. Balance, transactions and placed bets live on the
 * server (and settle there); only the in-progress bet slip is local. The hook
 * polls so settled bets and credited winnings appear automatically.
 */
export const useVirtualWallet = (_initialBalance?: number) => {
  const [balance, setBalance] = useState<number>(0);
  const [betSlip, setBetSlip] = useState<Bet[]>([]);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [w, b] = await Promise.all([fetchWallet(), fetchBets()]);
      setBalance(w.balance);
      setTransactions(w.transactions);
      setPlacedBets(sortBets(b));
    } catch (err) {
      console.warn('wallet refresh failed:', err);
    }
  }, []);

  // Initial load + poll so settlement (server-side) reflects in the UI.
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 20_000);
    return () => clearInterval(interval);
  }, [refresh]);

  // ---- Bet slip (local draft) ----
  const addToBetSlip = useCallback((selection: BetSelection) => {
    setBetSlip((prev) => {
      const existing = prev.find((b) => b.selection.matchId === selection.matchId);
      if (existing) {
        return prev.map((b) => (b.selection.matchId === selection.matchId ? { selection, wager: b.wager || 500 } : b));
      }
      return [...prev, { selection, wager: 500 }]; // default $5 (USD cents)
    });
  }, []);

  const removeFromBetSlip = useCallback((matchId: string) => {
    setBetSlip((prev) => prev.filter((b) => b.selection.matchId !== matchId));
  }, []);

  const updateWager = useCallback((matchId: string, wager: number) => {
    setBetSlip((prev) => prev.map((b) => (b.selection.matchId === matchId ? { ...b, wager } : b)));
  }, []);

  const clearBetSlip = useCallback(() => setBetSlip([]), []);

  // ---- Server operations ----
  const placeBet = useCallback(async (): Promise<Result> => {
    const total = betSlip.reduce((sum, b) => sum + b.wager, 0);
    if (total <= 0) return { success: false, message: 'Wager must be positive.' };
    try {
      const items = betSlip.map((b) => ({ selection: b.selection, wager: b.wager }));
      const res = await placeBets(items);
      setBalance(res.wallet.balance);
      setTransactions(res.wallet.transactions);
      setPlacedBets((prev) => sortBets([...res.bets, ...prev]));
      clearBetSlip();
      return { success: true, message: `Successfully placed ${res.bets.length} bet(s)!` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to place bet.' };
    }
  }, [betSlip, clearBetSlip]);

  const topUpWallet = useCallback(async (amount: number, method: string): Promise<Result> => {
    try {
      const r = await topUp(amount, method);
      if (r.kind === 'redirect') {
        // Crypto: send the user to the hosted invoice; the wallet is credited
        // by the provider webhook once payment confirms.
        return { success: true, message: 'Opening crypto checkout…', redirectUrl: r.url };
      }
      setBalance(r.wallet.balance);
      setTransactions(r.wallet.transactions);
      return { success: true, message: `Successfully added $${(amount / 100).toFixed(2)}!` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Top up failed.' };
    }
  }, []);

  const withdrawFromWallet = useCallback(async (amount: number, address: string): Promise<Result> => {
    if (amount <= 0) return { success: false, message: 'Withdrawal amount must be positive.' };
    if (!address) return { success: false, message: 'A withdrawal address is required.' };
    try {
      await requestWithdrawal(amount, address);
      await refresh(); // balance is held immediately
      return { success: true, message: `Withdrawal of $${(amount / 100).toFixed(2)} requested — pending review.` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Withdrawal failed.' };
    }
  }, [refresh]);

  return {
    balance,
    betSlip,
    placedBets,
    transactions,
    addToBetSlip,
    removeFromBetSlip,
    updateWager,
    placeBet,
    clearBetSlip,
    topUpWallet,
    withdrawFromWallet,
    refresh,
  };
};

export type UseVirtualWalletReturn = ReturnType<typeof useVirtualWallet>;
