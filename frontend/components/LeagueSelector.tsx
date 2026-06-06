
import React from 'react';
import type { League } from '../types';

interface LeagueSelectorProps {
  leagues: League[];
  selectedLeagueId: string;
  setSelectedLeagueId: (id: string) => void;
}

export const LeagueSelector: React.FC<LeagueSelectorProps> = ({ leagues, selectedLeagueId, setSelectedLeagueId }) => {
  return (
    <div className="overflow-x-auto">
      <nav className="flex space-x-4 border-b-2 border-gray-200 pb-2">
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => setSelectedLeagueId(league.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm sm:text-base font-semibold rounded-t-lg transition-colors duration-200 ease-in-out ${
              selectedLeagueId === league.id
                ? 'text-primary border-b-4 border-primary'
                : 'text-gray-600 hover:bg-gray-100 hover:text-neutral-dark'
            }`}
          >
            {league.name}
          </button>
        ))}
      </nav>
    </div>
  );
};
