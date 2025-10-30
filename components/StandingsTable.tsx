
import React from 'react';
import type { Standing } from '../types';

interface StandingsTableProps {
  standings: Standing[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => {
  if (standings.length === 0) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-10">Standings not available for this league.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-neutral-dark">
          <tr>
            <th scope="col" className="px-2 py-3 text-center">#</th>
            <th scope="col" className="px-6 py-3">Team</th>
            <th scope="col" className="px-2 py-3 text-center">MP</th>
            <th scope="col" className="px-2 py-3 text-center">W</th>
            <th scope="col" className="px-2 py-3 text-center">D</th>
            <th scope="col" className="px-2 py-3 text-center">L</th>
            <th scope="col" className="px-2 py-3 text-center">GD</th>
            <th scope="col" className="px-2 py-3 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.team.id} className="bg-white dark:bg-neutral-dark border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-neutral-gray">
              <td className="px-2 py-4 text-center">{s.rank}</td>
              <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap flex items-center space-x-3">
                <img src={s.team.logo} alt={s.team.name} className="h-5 w-5 object-contain" />
                <span>{s.team.name}</span>
              </th>
              <td className="px-2 py-4 text-center">{s.played}</td>
              <td className="px-2 py-4 text-center">{s.win}</td>
              <td className="px-2 py-4 text-center">{s.draw}</td>
              <td className="px-2 py-4 text-center">{s.loss}</td>
              <td className="px-2 py-4 text-center">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
              <td className="px-2 py-4 text-center font-bold text-gray-900 dark:text-white">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
