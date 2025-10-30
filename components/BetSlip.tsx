import React, { useState } from 'react';
import type { Bet } from '../types';
import { TrashIcon, XIcon, LockIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import BetConfirmationModal from './BetConfirmationModal';

interface BetSlipProps {
  bets: Bet[];
  onRemove: (matchId: string) => void;
  onWagerChange: (matchId: string, wager: number) => void;
  onPlaceBet: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const BetSlip: React.FC<BetSlipProps> = ({ bets, onRemove, onWagerChange, onPlaceBet, onClear, onClose }) => {
  const { isVerified } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const totalWager = bets.reduce((sum, bet) => sum + bet.wager, 0);
  const totalPayout = bets.reduce((sum, bet) => sum + bet.wager * bet.selection.odds, 0);
  const isBettingDisabled = !isVerified || bets.length === 0 || totalWager <= 0;

  const handlePlaceBet = () => {
    if (!isBettingDisabled) {
      setShowConfirmation(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-end sm:items-center" onClick={onClose}>
      <div 
        className="bg-neutral-light-gray dark:bg-neutral-dark-gray w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-lg p-4 flex flex-col max-h-[90vh] sm:max-h-[80vh] sm:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold">Bet Slip</h2>
          <div className="flex items-center space-x-4">
            {bets.length > 0 && (
              <button onClick={onClear} className="text-sm text-primary hover:underline">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-neutral-dark dark:hover:text-white">
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {bets.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">Your bet slip is empty.</p>
        ) : (
          <>
            <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
              {bets.map(({ selection, wager }) => (
                <div key={selection.matchId} className="bg-white dark:bg-neutral-dark p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selection.matchDescription}</p>
                      <p className="font-semibold">{selection.marketLabel}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg text-primary">{selection.odds.toFixed(2)}</span>
                      <button onClick={() => onRemove(selection.matchId)} className="text-gray-400 hover:text-red-500">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Tsh</span>
                      <input
                        type="number"
                        value={wager || ''}
                        onChange={(e) => onWagerChange(selection.matchId, parseFloat(e.target.value) || 0)}
                        placeholder="Wager"
                        className="w-32 pl-10 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-transparent"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">To Win</p>
                      <p className="font-semibold">{(wager * selection.odds).toLocaleString('en-US')} Tsh</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2 flex-shrink-0">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Total Wager:</span>
                <span>{totalWager.toLocaleString('en-US')} Tsh</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Potential Payout:</span>
                <span>{totalPayout.toLocaleString('en-US')} Tsh</span>
              </div>
            </div>

            <div className="relative mt-4 flex-shrink-0 pb-4 sm:pb-0">
              <button
                onClick={handlePlaceBet}
                disabled={isBettingDisabled}
                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {!isVerified && <LockIcon className="h-5 w-5" />}
                <span>Place Bet</span>
              </button>
              {!isVerified && bets.length > 0 && (
                <p className="text-center text-xs text-red-500 mt-2">Please verify your account to place bets.</p>
              )}
            </div>

            <BetConfirmationModal 
              bets={bets}
              isOpen={showConfirmation}
              onClose={() => setShowConfirmation(false)}
              onConfirm={() => {
                setShowConfirmation(false);
                onPlaceBet();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};