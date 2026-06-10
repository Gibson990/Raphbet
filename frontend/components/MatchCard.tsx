import React from 'react';
import type { Match } from '../types';

interface MatchCardProps {
  match: Match;
  onSelectOdd: (match: Match, market: '1' | 'X' | '2', odd: number) => void;
  onOpenMarkets?: (match: Match) => void;
  selectedMarket?: string;
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
    className={`flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl border transition-all active:scale-[0.97] ${
      active
        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
        : 'bg-gray-50 dark:bg-neutral-dark border-gray-200 dark:border-neutral-border hover:border-primary hover:bg-white dark:hover:bg-neutral-dark-card'
    } disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100`}
  >
    <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-white/75' : 'text-gray-400'}`}>{label}</span>
    <span className={`font-extrabold text-[15px] tabular-nums leading-none ${active ? 'text-white' : 'text-neutral-dark dark:text-white'}`}>
      {odd.toFixed(2)}
    </span>
  </button>
);

const TeamRow: React.FC<{ name: string; logo: string; score?: number; dim?: boolean }> = ({ name, logo, score, dim }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <img src={logo} alt="" className="h-6 w-6 object-contain shrink-0" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
    <span className={`font-semibold text-sm truncate ${dim ? 'text-gray-400' : ''}`}>{name}</span>
    {score !== undefined && <span className="ml-auto font-bold text-base tabular-nums pl-2">{score}</span>}
  </div>
);

export const MatchCard: React.FC<MatchCardProps> = ({ match, onSelectOdd, onOpenMarkets, selectedMarket }) => {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  // Count betting options beyond the three 1X2 prices shown on the card.
  const extraMarkets = (match.markets ?? []).reduce((n, m) => n + m.outcomes.length, 0) - 3;

  // Dim the losing side once a match is finished, for a cleaner result read.
  const homeLost = isFinished && match.score && match.score.home < match.score.away;
  const awayLost = isFinished && match.score && match.score.away < match.score.home;

  return (
    <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-4 transition-all hover:border-gray-300 dark:hover:border-neutral-border/80 hover:shadow-sm">
      {/* Status row */}
      <div className="flex items-center justify-between mb-3 h-4">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-live uppercase tracking-wide">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-live" />
            </span>
            Live · {match.time}
          </span>
        ) : isFinished ? (
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Full time</span>
        ) : (
          <span className="text-[11px] font-medium text-gray-400">
            {new Date(match.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2.5 mb-4">
        <TeamRow name={match.homeTeam.name} logo={match.homeTeam.logo} score={match.score?.home} dim={!!homeLost} />
        <TeamRow name={match.awayTeam.name} logo={match.awayTeam.logo} score={match.score?.away} dim={!!awayLost} />
      </div>

      {/* 1X2 odds */}
      <div className="grid grid-cols-3 gap-2">
        <OddButton label="Home" odd={match.odds.homeWin} active={selectedMarket === '1'} disabled={isFinished} onClick={() => onSelectOdd(match, '1', match.odds.homeWin)} />
        <OddButton label="Draw" odd={match.odds.draw} active={selectedMarket === 'X'} disabled={isFinished} onClick={() => onSelectOdd(match, 'X', match.odds.draw)} />
        <OddButton label="Away" odd={match.odds.awayWin} active={selectedMarket === '2'} disabled={isFinished} onClick={() => onSelectOdd(match, '2', match.odds.awayWin)} />
      </div>

      {!isFinished && extraMarkets > 0 && onOpenMarkets && (
        <button
          onClick={() => onOpenMarkets(match)}
          className="mt-2.5 w-full flex items-center justify-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary transition-colors py-1"
        >
          +{extraMarkets} more markets <span aria-hidden>›</span>
        </button>
      )}
    </div>
  );
};
