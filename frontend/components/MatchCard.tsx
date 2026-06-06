import React from 'react';
import type { Match } from '../types';

interface MatchCardProps {
  match: Match;
  onSelectOdd: (match: Match, market: '1' | 'X' | '2', odd: number) => void;
  selectedMarket?: '1' | 'X' | '2';
}

const OddButton: React.FC<{
  label: string;
  odd: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ label, odd, active, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${
      active
        ? 'bg-primary border-primary text-white'
        : 'bg-gray-50 dark:bg-neutral-dark border-gray-200 dark:border-neutral-border hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10'
    } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-200`}
  >
    <span className={`text-[10px] font-semibold uppercase ${active ? 'text-white/80' : 'text-gray-400'}`}>{label}</span>
    <span className="font-bold text-base tabular-nums">{odd.toFixed(2)}</span>
  </button>
);

const TeamRow: React.FC<{ name: string; logo: string; score?: number }> = ({ name, logo, score }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <img src={logo} alt={name} className="h-6 w-6 object-contain rounded-sm shrink-0" loading="lazy" />
    <span className="font-semibold text-sm truncate">{name}</span>
    {score !== undefined && <span className="ml-auto font-bold tabular-nums">{score}</span>}
  </div>
);

export const MatchCard: React.FC<MatchCardProps> = ({ match, onSelectOdd, selectedMarket }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';

  const statusBadge = isLive ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-live">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
      </span>
      LIVE {match.time}
    </span>
  ) : isFinished ? (
    <span className="text-xs font-semibold text-gray-400">Full time</span>
  ) : (
    <span className="text-xs font-medium text-gray-400">
      {new Date(match.date).toLocaleDateString([], { weekday: 'short' })}{' '}
      {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );

  return (
    <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-4 hover:shadow-md dark:hover:border-gray-600 transition-all">
      <div className="flex items-center justify-between mb-3">
        {statusBadge}
        <span className="text-[11px] text-gray-300 dark:text-gray-600 font-medium">World Cup</span>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 items-center mb-4">
        <div className="space-y-2 min-w-0">
          <TeamRow name={match.homeTeam.name} logo={match.homeTeam.logo} score={match.score?.home} />
          <TeamRow name={match.awayTeam.name} logo={match.awayTeam.logo} score={match.score?.away} />
        </div>
        {!match.score && <div className="text-xs font-semibold text-gray-300 dark:text-gray-600 px-2">VS</div>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <OddButton label="1 Home" odd={match.odds.homeWin} active={selectedMarket === '1'} disabled={isFinished} onClick={() => onSelectOdd(match, '1', match.odds.homeWin)} />
        <OddButton label="X Draw" odd={match.odds.draw} active={selectedMarket === 'X'} disabled={isFinished} onClick={() => onSelectOdd(match, 'X', match.odds.draw)} />
        <OddButton label="2 Away" odd={match.odds.awayWin} active={selectedMarket === '2'} disabled={isFinished} onClick={() => onSelectOdd(match, '2', match.odds.awayWin)} />
      </div>
    </div>
  );
};
