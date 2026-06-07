import React from 'react';
import type { Standing } from '../types';

interface StandingsTableProps {
  standings: Standing[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings }) => {
  if (standings.length === 0) {
    return <div className="text-center text-gray-400 py-10">Standings not available yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
        <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-dark">
          <tr>
            <th scope="col" className="px-2 py-3 text-center">#</th>
            <th scope="col" className="px-4 py-3">Team</th>
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
            <tr
              key={s.team.id}
              className="border-b border-gray-100 dark:border-neutral-border hover:bg-gray-50 dark:hover:bg-neutral-dark-card transition-colors"
            >
              <td className="px-2 py-3 text-center tabular-nums">{s.rank}</td>
              <th scope="row" className="px-4 py-3 font-semibold text-neutral-dark dark:text-white whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                  <img src={s.team.logo} alt={s.team.name} className="h-5 w-5 object-contain rounded-sm" />
                  <span>{s.team.name}</span>
                </div>
              </th>
              <td className="px-2 py-3 text-center tabular-nums">{s.played}</td>
              <td className="px-2 py-3 text-center tabular-nums">{s.win}</td>
              <td className="px-2 py-3 text-center tabular-nums">{s.draw}</td>
              <td className="px-2 py-3 text-center tabular-nums">{s.loss}</td>
              <td className="px-2 py-3 text-center tabular-nums">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
              <td className="px-2 py-3 text-center font-bold text-neutral-dark dark:text-white tabular-nums">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
