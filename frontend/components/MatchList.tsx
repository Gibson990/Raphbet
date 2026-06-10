import React from 'react';
import type { Match } from '../types';
import { MatchCard } from './MatchCard';
import { SoccerBallIcon } from './icons';

interface MatchListProps {
  matches: Match[];
  onSelectOdd: (match: Match, market: '1' | 'X' | '2', odd: number) => void;
  onOpenMarkets?: (match: Match) => void;
  selections?: Record<string, string>;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, onSelectOdd, onOpenMarkets, selections = {} }) => {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-4">
        <SoccerBallIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="font-semibold text-gray-600 dark:text-gray-300">No matches right now</p>
        <p className="text-sm text-gray-400 mt-1">Try another league, or check back soon for upcoming fixtures.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} onSelectOdd={onSelectOdd} onOpenMarkets={onOpenMarkets} selectedMarket={selections[match.id]} />
      ))}
    </div>
  );
};
