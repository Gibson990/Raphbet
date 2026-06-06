import React from 'react';
import type { Bet } from '../types';
import { TrashIcon, XIcon, LockIcon, TicketIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface BetSlipProps {
  bets: Bet[];
  onRemove: (matchId: string) => void;
  onWagerChange: (matchId: string, wager: number) => void;
  onPlaceBet: () => void;
  onClear: () => void;
  onClose: () => void;
  variant?: 'modal' | 'rail';
}

/** Shared inner content used by both the desktop rail and the mobile modal. */
const BetSlipContent: React.FC<BetSlipProps> = ({ bets, onRemove, onWagerChange, onPlaceBet, onClear }) => {
  const { isLoggedIn, isVerified } = useAuth();
  const { format } = useCurrency();
  const totalWager = bets.reduce((sum, bet) => sum + bet.wager, 0);
  const totalPayout = bets.reduce((sum, bet) => sum + bet.wager * bet.selection.odds, 0);
  // Auth is enforced when placing (routes to login/KYC), so we only disable on
  // an empty/zero slip — guests can still click to be prompted to sign in.
  const isBettingDisabled = bets.length === 0 || totalWager <= 0;
  const needsAuth = !isLoggedIn || !isVerified;
  const ctaLabel = !isLoggedIn ? 'Log in to bet' : !isVerified ? 'Verify to bet' : 'Place Bet';

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
      <div className="space-y-3 overflow-y-auto pr-1 flex-grow">
        {bets.map(({ selection, wager }) => (
          <div key={selection.matchId} className="bg-gray-50 dark:bg-neutral-dark rounded-xl p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">{selection.matchDescription}</p>
                <p className="font-semibold text-sm">{selection.marketLabel}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-primary tabular-nums">{selection.odds.toFixed(2)}</span>
                <button onClick={() => onRemove(selection.matchId)} className="text-gray-400 hover:text-danger">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Tsh</span>
                <input
                  type="number"
                  value={wager || ''}
                  onChange={(e) => onWagerChange(selection.matchId, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-28 pl-9 pr-2 py-1.5 text-sm border border-gray-300 dark:border-neutral-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary bg-transparent tabular-nums"
                />
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400">To win</p>
                <p className="font-semibold text-sm tabular-nums">{format(wager * selection.odds)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-neutral-border space-y-1.5">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Total stake</span>
          <span className="tabular-nums">{format(totalWager)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Potential payout</span>
          <span className="text-success tabular-nums">{format(totalPayout)}</span>
        </div>
      </div>

      <button
        onClick={onPlaceBet}
        disabled={isBettingDisabled}
        className="mt-3 w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-dark-card disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {needsAuth && <LockIcon className="h-5 w-5" />}
        <span>{ctaLabel}</span>
      </button>
      {needsAuth && (
        <p className="text-center text-xs text-gray-400 mt-2">
          {!isLoggedIn ? "You'll be asked to sign in first." : 'Account verification is required to bet.'}
        </p>
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
