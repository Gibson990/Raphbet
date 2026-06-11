import React from 'react';
import type { Match, Outcome } from '../types';
import Modal from './common/Modal';
import { useOddsFormat } from '../contexts/OddsFormatContext';

interface MarketsModalProps {
  match: Match;
  selectedCode?: string;
  onSelect: (match: Match, outcome: Outcome) => void;
  onClose: () => void;
}

/** Full market board for a match (1X2, Over/Under, BTTS, halves). */
export const MarketsModal: React.FC<MarketsModalProps> = ({ match, selectedCode, onSelect, onClose }) => {
  const { fmtOdds } = useOddsFormat();
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
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-sm transition-all active:scale-[0.98] ${
                      active
                        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
                        : 'bg-gray-50 dark:bg-neutral-dark border-gray-200 dark:border-neutral-border hover:border-primary hover:bg-white dark:hover:bg-neutral-dark-card'
                    }`}
                  >
                    <span className="truncate text-left font-medium">{o.label}</span>
                    <span className={`font-extrabold tabular-nums shrink-0 ${active ? 'text-white' : 'text-primary'}`}>{fmtOdds(o.odds)}</span>
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
