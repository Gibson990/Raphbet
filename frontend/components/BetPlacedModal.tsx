import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './common/Modal';
import { CheckCircleIcon } from './icons';
import { useCurrency } from '../contexts/CurrencyContext';

export interface BetPlacedInfo {
  count: number;
  stake: number;
  payout: number;
}

interface BetPlacedModalProps {
  info: BetPlacedInfo;
  onClose: () => void;
}

/** Success screen shown after a bet is placed. */
export const BetPlacedModal: React.FC<BetPlacedModalProps> = ({ info, onClose }) => {
  const navigate = useNavigate();
  const { format } = useCurrency();

  return (
    <Modal title="Bet placed" onClose={onClose}>
      <div className="text-center">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon className="h-9 w-9 text-success" />
        </div>
        <h3 className="text-lg font-extrabold">You're in!</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {info.count} selection{info.count > 1 ? 's' : ''} placed successfully.
        </p>

        <div className="mt-5 bg-gray-50 dark:bg-neutral-dark rounded-xl p-4 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total stake</span>
            <span className="font-semibold tabular-nums">{format(info.stake)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Potential payout</span>
            <span className="font-bold text-success tabular-nums">{format(info.payout)}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl font-bold border border-gray-300 dark:border-neutral-border hover:bg-gray-50 dark:hover:bg-neutral-dark-card transition-colors">
            Keep betting
          </button>
          <button onClick={() => { onClose(); navigate('/bets'); }} className="flex-1 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors">
            View my bets
          </button>
        </div>
      </div>
    </Modal>
  );
};
