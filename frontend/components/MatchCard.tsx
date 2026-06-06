import React from 'react';
import type { Match } from '../types';
import { ClockIcon } from './icons';

interface MatchCardProps {
  match: Match;
  onSelectOdd: (match: Match, market: '1' | 'X' | '2', odd: number) => void;
}

const OddButton: React.FC<{ label: string; odd: number; onClick: () => void }> = ({ label, odd, onClick }) => (
  <button 
    onClick={onClick}
    className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg bg-neutral-light-gray dark:bg-neutral-gray hover:bg-accent hover:text-white dark:hover:text-neutral-dark transition-all duration-200"
  >
    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    <span className="font-bold text-lg">{odd.toFixed(2)}</span>
  </button>
);

export const MatchCard: React.FC<MatchCardProps> = ({ match, onSelectOdd }) => {
  const getStatusDisplay = () => {
    switch(match.status) {
      case 'UPCOMING':
        return (
          <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
            <ClockIcon className="h-4 w-4" />
            <span>{new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      case 'LIVE':
        return <div className="text-sm font-bold text-red-500 animate-pulse">{match.time}'</div>;
      case 'FINISHED':
        return <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">FT</div>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        {/* Home Team */}
        <div className="flex items-center space-x-3 w-2/5">
          <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="h-8 w-8 object-contain" />
          <span className="font-semibold text-sm sm:text-base hidden sm:block">{match.homeTeam.name}</span>
          <span className="font-semibold text-sm sm:text-base sm:hidden">{match.homeTeam.name.substring(0,3).toUpperCase()}</span>
        </div>
        
        {/* Score/Status */}
        <div className="flex flex-col items-center flex-shrink-0 mx-2">
          {match.status !== 'UPCOMING' && match.score ? (
            <div className="text-2xl font-bold">{match.score.home} - {match.score.away}</div>
          ) : (
            <div className="text-xl font-bold text-gray-400">vs</div>
          )}
          {getStatusDisplay()}
        </div>

        {/* Away Team */}
        <div className="flex items-center space-x-3 justify-end w-2/5">
          <span className="font-semibold text-sm sm:text-base hidden sm:block">{match.awayTeam.name}</span>
          <span className="font-semibold text-sm sm:text-base sm:hidden">{match.awayTeam.name.substring(0,3).toUpperCase()}</span>
          <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="h-8 w-8 object-contain" />
        </div>
      </div>
      
      {/* Odds */}
      <div className="mt-4 flex justify-between items-center space-x-2 sm:space-x-4">
        <OddButton label="1" odd={match.odds.homeWin} onClick={() => onSelectOdd(match, '1', match.odds.homeWin)} />
        <OddButton label="X" odd={match.odds.draw} onClick={() => onSelectOdd(match, 'X', match.odds.draw)} />
        <OddButton label="2" odd={match.odds.awayWin} onClick={() => onSelectOdd(match, '2', match.odds.awayWin)} />
      </div>
    </div>
  );
};