import React, { useState, useMemo } from 'react';
import type { PlacedBet } from '../types';
import { TicketIcon } from '../components/icons';

interface BetStatusBadgeProps {
  status: PlacedBet['status'];
}

const BetStatusBadge: React.FC<BetStatusBadgeProps> = ({ status }) => {
  const baseClasses = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
  switch (status) {
    case 'PENDING':
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>Pending</span>;
    case 'WON':
      return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>Won</span>;
    case 'LOST':
      return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`}>Lost</span>;
    default:
      return null;
  }
};

const BetHistoryCard: React.FC<{ bet: PlacedBet }> = ({ bet }) => {
  const getPayoutText = () => {
    if (bet.status === 'WON') {
      return `+${(bet.payout || 0).toLocaleString('en-US')} Tsh`;
    }
    if (bet.status === 'LOST') {
      return `-${bet.wager.toLocaleString('en-US')} Tsh`;
    }
    return `${(bet.wager * bet.selection.odds).toLocaleString('en-US')} Tsh`;
  };

  return (
    <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">{bet.selection.marketLabel} @ {bet.selection.odds.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-white/70">{bet.selection.matchDescription}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Placed: {new Date(bet.placedDate).toLocaleString()}
          </p>
        </div>
        <BetStatusBadge status={bet.status} />
      </div>
      <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center text-sm">
        <div>
          <span className="text-gray-500 dark:text-white/70">Wager: </span>
          <span className="font-semibold">{bet.wager.toLocaleString('en-US')} Tsh</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">{bet.status === 'PENDING' ? 'To Win:' : 'Result:'} </span>
          <span className={`font-semibold ${bet.status === 'WON' ? 'text-green-500' : bet.status === 'LOST' ? 'text-red-500' : ''}`}>
            {getPayoutText()}
          </span>
        </div>
      </div>
    </div>
  );
};


interface MyBetsScreenProps {
  bets: PlacedBet[];
}

const MyBetsScreen: React.FC<MyBetsScreenProps> = ({ bets }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'settled'>('active');
  
  const filteredBets = useMemo(() => {
    const sortedBets = [...bets].sort((a, b) => new Date(b.placedDate).getTime() - new Date(a.placedDate).getTime());
    if (activeTab === 'active') {
      return sortedBets.filter(b => b.status === 'PENDING');
    }
    return sortedBets.filter(b => b.status === 'WON' || b.status === 'LOST');
  }, [bets, activeTab]);

  return (
    <div className="py-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">My Bets</h1>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button 
          onClick={() => setActiveTab('active')}
          className={`py-2 px-4 font-semibold ${activeTab === 'active' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Active
        </button>
        <button 
          onClick={() => setActiveTab('settled')}
          className={`py-2 px-4 font-semibold ${activeTab === 'settled' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Settled
        </button>
      </div>

      {filteredBets.length === 0 ? (
         <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex flex-col items-center space-y-4">
            <TicketIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold">No {activeTab} bets</h3>
            <p>Your {activeTab} bets will appear here.</p>
         </div>
      ) : (
        <div className="space-y-4">
            {filteredBets.map((bet) => <BetHistoryCard key={bet.id} bet={bet} />)}
        </div>
      )}
    </div>
  );
};

export default MyBetsScreen;