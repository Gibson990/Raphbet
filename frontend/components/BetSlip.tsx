import React, { useEffect, useState } from 'react';
import type { Bet } from '../types';
import { TrashIcon, XIcon, LockIcon, TicketIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { fetchLimits, cachedLimits, usd, type AppLimits } from '../services/config';
import { winBoostPercent as accaBoostPercent, MAX_ACCA_LEGS } from '../services/accaBoost';

interface BetSlipProps {
  bets: Bet[];
  balance: number;
  onRemove: (matchId: string) => void;
  onWagerChange: (matchId: string, wager: number) => void;
  onPlaceBet: (isMulti?: boolean, multiWager?: number) => void;
  onClear: () => void;
  onClose: () => void;
  variant?: 'modal' | 'rail';
}

/** Shared inner content used by both the desktop rail and the mobile modal. */
const BetSlipContent: React.FC<BetSlipProps> = ({ bets, balance, onRemove, onWagerChange, onPlaceBet, onClear }) => {
  const { isLoggedIn, isVerified } = useAuth();
  const { format } = useCurrency();
  const [limits, setLimits] = useState<AppLimits>(cachedLimits());
  const [isAccumulator, setIsAccumulator] = useState(false);
  const [accWager, setAccWager] = useState<number>(0);

  useEffect(() => {
    fetchLimits().then(setLimits);
  }, []);

  // Combined Accumulator calculations (display only — the server reprices and
  // recomputes the boost authoritatively at placement).
  const combinedMultiplier = bets.reduce((prod, b) => prod * b.selection.odds, 1);
  const winBoostPercent = accaBoostPercent(bets.length);
  const tooManyLegs = bets.length > MAX_ACCA_LEGS;

  // Derive wager and payouts based on mode
  const totalWager = isAccumulator ? accWager : bets.reduce((sum, bet) => sum + bet.wager, 0);
  const totalPayout = isAccumulator
    ? accWager * combinedMultiplier * (1 + winBoostPercent / 100)
    : bets.reduce((sum, bet) => sum + bet.wager * bet.selection.odds, 0);

  const overLimit = isAccumulator
    ? isLoggedIn && isVerified && accWager > limits.maxBet
    : isLoggedIn && isVerified && bets.some((b) => b.wager > limits.maxBet);

  const isBettingDisabled = isAccumulator
    ? bets.length === 0 || accWager <= 0 || overLimit || tooManyLegs
    : bets.length === 0 || totalWager <= 0 || overLimit;

  const insufficient = isLoggedIn && isVerified && totalWager > balance;
  const needsAuth = !isLoggedIn || !isVerified;
  const ctaLabel = !isLoggedIn ? 'Log in to bet' : !isVerified ? 'Verify to bet' : insufficient ? 'Top up to bet' : 'Place Bet';

  // Quick-stake chips: set the accumulator stake, or set every single's stake.
  const quickStakes = [500, 1000, 2500]; // $5 / $10 / $25 (USD cents)
  const setStake = (cents: number) => {
    if (isAccumulator) setAccWager(cents);
    else bets.forEach((b) => onWagerChange(b.selection.matchId, cents));
  };
  const setMaxStake = () => {
    if (isAccumulator) setAccWager(Math.min(balance, limits.maxBet));
    else {
      const per = bets.length ? Math.min(limits.maxBet, Math.floor(balance / bets.length)) : 0;
      bets.forEach((b) => onWagerChange(b.selection.matchId, per));
    }
  };

  if (bets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6">
        <div className="h-14 w-14 rounded-full bg-gray-100 dark:bg-neutral-dark flex items-center justify-center mb-3">
          <TicketIcon className="h-7 w-7 text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700 dark:text-gray-200">Your bet slip is empty</p>
        <p className="text-sm text-gray-400 mt-1">Tap any odds to add a selection.</p>
      </div>
    );
  }

  return (
    <>
      {/* Sliding Mode Selector */}
      <div className="mb-4 bg-gray-100 dark:bg-neutral-dark p-1 rounded-xl flex">
        <button
          onClick={() => setIsAccumulator(false)}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
            !isAccumulator
              ? 'bg-white dark:bg-neutral-dark-gray shadow text-neutral-dark dark:text-white'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          }`}
        >
          Singles
        </button>
        <button
          onClick={() => setIsAccumulator(true)}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            isAccumulator
              ? 'bg-gradient-to-r from-primary to-purple-600 shadow text-white'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          }`}
        >
          Accumulator
          {winBoostPercent > 0 && (
            <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
              +{winBoostPercent}%
            </span>
          )}
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto pr-1 flex-grow">
        {bets.map(({ selection, wager }) => (
          <div key={selection.matchId} className="bg-gray-50 dark:bg-neutral-dark rounded-xl p-3 border border-transparent hover:border-gray-200 dark:hover:border-neutral-border transition-all">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">{selection.matchDescription}</p>
                <p className="font-semibold text-sm">{selection.marketLabel}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-primary text-sm tabular-nums">{selection.odds.toFixed(2)}</span>
                <button onClick={() => onRemove(selection.matchId)} className="text-gray-400 hover:text-danger transition-colors">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {!isAccumulator && (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                  <input
                    type="number"
                    value={wager ? wager / 100 : ''}
                    onChange={(e) => onWagerChange(selection.matchId, Math.round((parseFloat(e.target.value) || 0) * 100))}
                    placeholder="0"
                    className="w-28 pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-neutral-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary bg-transparent tabular-nums"
                  />
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400">To win</p>
                  <p className="font-semibold text-sm text-primary dark:text-white tabular-nums">{format(wager * selection.odds)}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAccumulator && (
        <div className="mt-4 bg-gradient-to-r from-primary/10 to-purple-600/10 dark:from-primary/5 dark:to-purple-600/5 border border-primary/20 dark:border-primary/10 rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Combined Odds</span>
            </div>
            <span className="font-black text-primary text-base tabular-nums">{combinedMultiplier.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-primary/10">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
              <input
                type="number"
                value={accWager ? accWager / 100 : ''}
                onChange={(e) => setAccWager(Math.round((parseFloat(e.target.value) || 0) * 100))}
                placeholder="Stake amount"
                className="w-32 pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-neutral-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary bg-transparent font-bold tabular-nums text-primary dark:text-white"
              />
            </div>
            <div className="text-right">
              <p className="text-[11px] text-gray-400">Potential win</p>
              <p className="font-black text-sm text-success tabular-nums">{format(accWager * combinedMultiplier)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick-stake chips */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {quickStakes.map((c) => (
          <button
            key={c}
            onClick={() => setStake(c)}
            className="py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-neutral-dark text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white active:scale-95 transition-all"
          >
            ${c / 100}
          </button>
        ))}
        <button
          onClick={setMaxStake}
          className="py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-neutral-dark text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white active:scale-95 transition-all"
        >
          Max
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-neutral-border space-y-1.5">
        {isAccumulator && winBoostPercent > 0 && (
          <div className="flex justify-between text-xs font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-1.5 rounded-lg border border-purple-200/50 dark:border-purple-800/30 mb-2">
            <span>Win Boost ({bets.length} selections)</span>
            <span>+{winBoostPercent}% (+{format(accWager * combinedMultiplier * (winBoostPercent / 100))})</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Total stake</span>
          <span className="tabular-nums font-semibold">{format(totalWager)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Potential payout</span>
          <span className="text-success text-base tabular-nums font-black">{format(totalPayout)}</span>
        </div>
        <p className="text-[11px] text-gray-400 pt-0.5">Stake {usd(limits.minBet)}–{usd(limits.maxBet)} per selection</p>
      </div>

      <button
        onClick={() => onPlaceBet(isAccumulator, accWager)}
        disabled={isBettingDisabled}
        className="mt-3 w-full bg-gradient-to-r from-primary to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-95 transition-opacity disabled:bg-gray-300 dark:disabled:bg-neutral-dark-card disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-neutral-dark-card dark:disabled:to-neutral-dark-card disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {needsAuth && <LockIcon className="h-5 w-5" />}
        <span>{ctaLabel}</span>
      </button>
      {needsAuth && (
        <p className="text-center text-xs text-gray-400 mt-2">
          {!isLoggedIn ? "You'll be asked to sign in first." : 'Account verification is required to bet.'}
        </p>
      )}
      {insufficient && (
        <p className="text-center text-xs text-danger mt-2">Insufficient balance — top up to place this bet.</p>
      )}
      {overLimit && (
        <p className="text-center text-xs text-danger mt-2">Wager exceeds the max stake of {usd(limits.maxBet)}.</p>
      )}
      {isAccumulator && tooManyLegs && (
        <p className="text-center text-xs text-danger mt-2">An accumulator can have at most {MAX_ACCA_LEGS} selections.</p>
      )}
    </>
  );
};

const SlipHeader: React.FC<{ count: number; onClear: () => void; onClose?: () => void }> = ({ count, onClear, onClose }) => (
  <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-200 dark:border-neutral-border shrink-0">
    <h2 className="text-lg font-bold flex items-center gap-2">
      Bet Slip
      {count > 0 && <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-primary rounded-full">{count}</span>}
    </h2>
    <div className="flex items-center gap-3">
      {count > 0 && <button onClick={onClear} className="text-sm text-primary hover:underline">Clear</button>}
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-neutral-dark dark:hover:text-white lg:hidden">
          <XIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  </div>
);

export const BetSlip: React.FC<BetSlipProps> = (props) => {
  // Desktop: embedded sticky rail card.
  if (props.variant === 'rail') {
    return (
      <div className="flex flex-col bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-4 max-h-[calc(100vh-7rem)]">
        <SlipHeader count={props.bets.length} onClear={props.onClear} />
        <BetSlipContent {...props} />
      </div>
    );
  }

  // Mobile: bottom-sheet modal.
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex justify-center items-end lg:hidden" onClick={props.onClose}>
      <div
        className="bg-white dark:bg-neutral-dark-gray w-full max-w-lg rounded-t-2xl shadow-xl p-4 flex flex-col max-h-[85vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <SlipHeader count={props.bets.length} onClear={props.onClear} onClose={props.onClose} />
        <BetSlipContent {...props} />
      </div>
    </div>
  );
};
