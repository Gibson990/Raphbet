
import React from 'react';
import type { Match } from '../types';
import { MatchCard } from './MatchCard';

interface MatchListProps {
  matches: Match[];
  onSelectOdd: (match: Match, market: '1' | 'X' | '2', odd: number) => void;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, onSelectOdd }) => {
  if (matches.length === 0) {
    return <div className="text-center text-gray-500 py-10">No matches available for this league.</div>;
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} onSelectOdd={onSelectOdd} />
      ))}
    </div>
  );
};
