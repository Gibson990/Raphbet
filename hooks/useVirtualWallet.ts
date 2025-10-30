import { useState, useCallback } from 'react';
import type { Bet, BetSelection, PlacedBet, Transaction } from '../types';

export const useVirtualWallet = (initialBalance: number) => {
  const [balance, setBalance] = useState<number>(initialBalance);
  const [betSlip, setBetSlip] = useState<Bet[]>([]);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = useCallback((type: Transaction['type'], amount: number, description: string) => {
    const newTransaction: Transaction = {
      id: `txn-${new Date().getTime()}-${Math.random()}`,
      type,
      amount,
      description,
      date: new Date().toISOString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  }, []);

  const topUpWallet = useCallback((amount: number, method: string) => {
    try {
      if (amount <= 0) {
        return { success: false, message: 'Invalid amount' };
      }
      
      setBalance(prev => prev + amount);
      addTransaction('Top-up', amount, `Top up via ${method}`);
      
      return { success: true, message: `Successfully topped up ${amount.toLocaleString()} Tsh` };
    } catch (error) {
      return { success: false, message: 'Failed to process top up' };
    }
  }, [addTransaction]);

  const addToBetSlip = useCallback((selection: BetSelection) => {
    setBetSlip((prev) => {
      const existingBet = prev.find(b => b.selection.matchId === selection.matchId);
      if (existingBet) {
        return prev.map(b => b.selection.matchId === selection.matchId ? { selection, wager: b.wager || 10000 } : b);
      }
      return [...prev, { selection, wager: 10000 }]; // Default wager 10,000 TSH
    });
  }, []);

  const removeFromBetSlip = useCallback((matchId: string) => {
    setBetSlip((prev) => prev.filter(b => b.selection.matchId !== matchId));
  }, []);

  const updateWager = useCallback((matchId: string, wager: number) => {
    setBetSlip((prev) => prev.map(b => b.selection.matchId === matchId ? { ...b, wager } : b));
  }, []);
  
  const clearBetSlip = useCallback(() => {
    setBetSlip([]);
  }, []);

  const simulateBetSettlement = useCallback((bet: PlacedBet) => {
    setTimeout(() => {
      const isWin = Math.random() < 0.4; // 40% chance of winning
      setPlacedBets(prev => 
        prev.map(b => {
          if (b.id === bet.id) {
            const newStatus = isWin ? 'WON' : 'LOST';
            const payout = isWin ? b.wager * b.selection.odds : 0;
            if (isWin) {
              setBalance(bal => bal + payout);
              addTransaction('Payout', payout, `Win: ${b.selection.marketLabel} on ${b.selection.matchDescription}`);
            }
            return { ...b, status: newStatus, payout };
          }
          return b;
        })
      );
    }, 10000 + Math.random() * 10000); // Settle between 10-20 seconds
  }, [addTransaction]);


  const placeBet = useCallback(() => {
    const totalWager = betSlip.reduce((sum, bet) => sum + bet.wager, 0);

    if (totalWager <= 0) return { success: false, message: 'Wager must be positive.' };
    if (totalWager > balance) return { success: false, message: 'Insufficient balance.' };

    const newBets: PlacedBet[] = betSlip.map(b => ({
      ...b,
      id: `${b.selection.matchId}-${new Date().getTime()}`,
      placedDate: new Date().toISOString(),
      status: 'PENDING',
    }));
    
    setPlacedBets(prev => [...newBets, ...prev]);
    newBets.forEach(simulateBetSettlement);
    
    setBalance(prev => prev - totalWager);
    addTransaction('Wager', -totalWager, `${betSlip.length} bet(s) placed`);
    clearBetSlip();
    return { success: true, message: `Successfully placed ${newBets.length} bet(s)!` };
  }, [balance, betSlip, clearBetSlip, simulateBetSettlement, addTransaction]);

  const withdrawFromWallet = useCallback((amount: number, method: string) => {
    if (amount <= 0) return { success: false, message: 'Withdrawal amount must be positive.' };
    if (amount > balance) return { success: false, message: 'Insufficient balance for withdrawal.' };
    
    setBalance(prev => prev - amount);
    addTransaction('Withdrawal', -amount, `Withdrawal to ${method}`);
    return { success: true, message: `Successfully withdrew ${amount.toLocaleString('en-US')} Tsh!` };
  }, [addTransaction, balance]);

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
  };
};

export type UseVirtualWalletReturn = ReturnType<typeof useVirtualWallet>;