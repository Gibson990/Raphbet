import React from 'react';
import type { Match, Outcome } from '../types';
import Modal from './common/Modal';

interface MarketsModalProps {
  match: Match;
  selectedCode?: string;
  onSelect: (match: Match, outcome: Outcome) => void;
  onClose: () => void;
}

/** Full market board for a match (1X2, Over/Under, BTTS, halves). */
export const MarketsModal: React.FC<MarketsModalProps> = ({ match, selectedCode, onSelect, onClose }) => {
  const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        {(match.markets ?? []).map((market) => (
          <div key={market.key}>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">{market.label}</h3>
            <div className="grid grid-cols-2 gap-2">
              {market.outcomes.map((o) => {
                const active = selectedCode === o.code;
                return (
                  <button
                    key={o.code}
                    onClick={() => onSelect(match, o)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      active
                        ? 'bg-primary border-primary text-white'
                        : 'bg-gray-50 dark:bg-neutral-dark border-gray-200 dark:border-neutral-border hover:border-primary'
                    }`}
                  >
                    <span className="truncate text-left">{o.label}</span>
                    <span className="font-bold tabular-nums shrink-0">{o.odds.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {(match.markets ?? []).length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">No markets available for this match.</p>
        )}
      </div>
    </Modal>
  );
};
