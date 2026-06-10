import React from 'react';
import type { League } from '../types';

interface LeagueSelectorProps {
  leagues: League[];
  selectedLeagueId: string;
  setSelectedLeagueId: (id: string) => void;
}

/** League filter — logo + name chips that wrap onto multiple rows (no side-scroll).
 *  Clean and simple: tap a league to switch the board. */
export const LeagueSelector: React.FC<LeagueSelectorProps> = ({ leagues, selectedLeagueId, setSelectedLeagueId }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {leagues.map((league) => {
          const active = selectedLeagueId === league.id;
          return (
            <button
              key={league.id}
              onClick={() => setSelectedLeagueId(league.id)}
              aria-pressed={active}
              className={`flex items-center gap-2 shrink-0 pl-1.5 pr-3.5 py-1.5 rounded-full border text-sm font-semibold transition-all ${
                active
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                  : 'bg-white dark:bg-neutral-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-neutral-border hover:border-primary/40 hover:text-neutral-dark dark:hover:text-white'
              }`}
            >
              <span className="h-6 w-6 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 border border-black/5">
                <img
                  src={league.logo}
                  alt=""
                  className="h-4 w-4 object-contain"
                  loading="lazy"
                  onError={(e) => { (e.currentTarget.style.display = 'none'); }}
                />
              </span>
              <span className="whitespace-nowrap">{league.name}</span>
            </button>
          );
        })}
    </div>
  );
};
