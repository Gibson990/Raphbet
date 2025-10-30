
import React from 'react';
import type { League } from '../types';

interface LeagueSelectorProps {
  leagues: League[];
  selectedLeagueId: string;
  setSelectedLeagueId: (id: string) => void;
}

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({ leagues, selectedLeagueId, setSelectedLeagueId }) => {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <nav className="flex space-x-2 border-b-2 border-gray-100 dark:border-gray-700 pb-2">
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => setSelectedLeagueId(league.id)}
            className={`flex-shrink-0 px-5 py-3 text-base font-bold rounded-t-lg transition-all duration-300 ease-in-out outline-none ${
              selectedLeagueId === league.id
                ? 'text-white bg-primary shadow-inner'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-neutral-dark dark:hover:text-white'
            }`}
          >
            {league.name}
          </button>
        ))}
      </nav>
    </div>
  );
};
