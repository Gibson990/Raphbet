import React, { useState, useMemo } from 'react';
import type { PlacedBet } from '../types';
import { TicketIcon } from '../components/icons';
import { useAppOutlet } from '../hooks/useAppOutlet';
import { useCurrency } from '../contexts/CurrencyContext';
import { downloadBetSlip } from '../services/receipt';

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
    case 'CASHED_OUT':
      return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`}>Cashed out</span>;
    default:
      return null;
  }
};

const BetHistoryCard: React.FC<{ bet: PlacedBet; onDownloadFail: () => void; onCashOut: (id: string) => Promise<void> }> = ({ bet, onDownloadFail, onCashOut }) => {
  const { format } = useCurrency();
  const [cashingOut, setCashingOut] = useState(false);

  const handleDownload = () => {
    if (!downloadBetSlip(bet, format)) onDownloadFail();
  };

  const doCashOut = async () => {
    setCashingOut(true);
    try { await onCashOut(bet.id); } finally { setCashingOut(false); }
  };

  const cashoutAvailable = bet.status === 'PENDING' && !bet.isMulti && (bet.cashoutValue ?? 0) > 0;

  // An accumulator carries multiple legs and a combined multiplier + win boost;
  // a single bet pays stake × odds. Compute the potential payout the same way
  // the server does so the displayed "To Win" matches what actually settles.
  const isMulti = !!bet.isMulti && Array.isArray(bet.selections) && bet.selections.length > 0;
  const legs = bet.selections ?? [bet.selection];
  const combinedOdds = isMulti ? (bet.multiplier ?? legs.reduce((p, s) => p * s.odds, 1)) : bet.selection.odds;
  const boost = bet.winBoost ?? 0;
  const potentialWin = bet.wager * combinedOdds * (1 + boost);

  const getPayoutText = () => {
    if (bet.status === 'WON') return `+${format(bet.payout || 0)}`;
    if (bet.status === 'CASHED_OUT') return `+${format(bet.payout || 0)}`;
    if (bet.status === 'LOST') return `-${format(bet.wager)}`;
    return format(potentialWin);
  };

  return (
    <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          {isMulti ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold">Accumulator · {legs.length} legs</p>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tabular-nums">@ {combinedOdds.toFixed(2)}</span>
                {boost > 0 && (
                  <span className="text-xs font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full">+{Math.round(boost * 100)}% boost</span>
                )}
              </div>
              <ul className="mt-2 space-y-1">
                {legs.map((s, i) => (
                  <li key={`${s.matchId}-${i}`} className="text-sm text-gray-600 dark:text-gray-300 flex justify-between gap-2">
                    <span className="truncate"><span className="font-semibold">{s.marketLabel}</span> · {s.matchDescription}</span>
                    <span className="tabular-nums text-gray-400 shrink-0">{s.odds.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="font-bold">{bet.selection.marketLabel} @ {bet.selection.odds.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{bet.selection.matchDescription}</p>
            </>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Placed: {new Date(bet.placedDate).toLocaleString()}
          </p>
        </div>
        <BetStatusBadge status={bet.status} />
      </div>
      <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Wager: </span>
          <span className="font-semibold">{format(bet.wager)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">{bet.status === 'PENDING' ? 'To Win:' : 'Result:'} </span>
          <span className={`font-semibold ${bet.status === 'WON' ? 'text-green-500' : bet.status === 'LOST' ? 'text-red-500' : ''}`}>
            {getPayoutText()}
          </span>
        </div>
      </div>
      {cashoutAvailable && (
        <button
          onClick={doCashOut}
          disabled={cashingOut}
          className="mt-3 w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-success hover:opacity-90 active:scale-[0.98] rounded-lg py-2.5 transition-all disabled:opacity-60"
        >
          {cashingOut ? 'Cashing out…' : `Cash out ${format(bet.cashoutValue!)}`}
        </button>
      )}
      <button
        onClick={handleDownload}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary border border-gray-200 dark:border-neutral-border rounded-lg py-2 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Download receipt
      </button>
    </div>
  );
};


const MyBetsScreen: React.FC = () => {
  const { wallet, addToast } = useAppOutlet();
  const { format } = useCurrency();
  const bets = wallet.placedBets;
  const [activeTab, setActiveTab] = useState<'active' | 'settled'>('active');

  const handleCashOut = async (id: string) => {
    const res = await wallet.cashOut(id);
    addToast(res.message, res.success ? 'success' : 'error');
  };

  const { activeBets, settledBets } = useMemo(() => {
    const sorted = [...bets].sort((a, b) => new Date(b.placedDate).getTime() - new Date(a.placedDate).getTime());
    return {
      activeBets: sorted.filter(b => b.status === 'PENDING'),
      settledBets: sorted.filter(b => b.status === 'WON' || b.status === 'LOST' || b.status === 'CASHED_OUT'),
    };
  }, [bets]);

  const filteredBets = activeTab === 'active' ? activeBets : settledBets;

  // Summary of what's riding right now: total staked and what it returns if everything lands.
  const activeStake = useMemo(() => activeBets.reduce((s, b) => s + b.wager, 0), [activeBets]);
  const activeReturn = useMemo(() => activeBets.reduce((s, b) => {
    const legs = b.selections ?? [b.selection];
    const odds = b.isMulti ? (b.multiplier ?? legs.reduce((p, l) => p * l.odds, 1)) : b.selection.odds;
    return s + b.wager * odds * (1 + (b.winBoost ?? 0));
  }, 0), [activeBets]);

  return (
    <div className="py-4">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-4">My Bets</h1>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {([['active', activeBets.length], ['settled', settledBets.length]] as const).map(([tab, count]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 font-semibold capitalize ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {tab}
            {count > 0 && (
              <span className={`ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs rounded-full ${activeTab === tab ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-neutral-dark text-gray-500 dark:text-gray-400'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'active' && activeBets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold tabular-nums">{format(activeStake)}</p>
            <p className="text-[11px] text-gray-400 uppercase font-semibold">Total staked</p>
          </div>
          <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold tabular-nums text-success">{format(activeReturn)}</p>
            <p className="text-[11px] text-gray-400 uppercase font-semibold">Potential return</p>
          </div>
        </div>
      )}

      {filteredBets.length === 0 ? (
         <div className="text-center text-gray-500 dark:text-gray-400 py-10 flex flex-col items-center space-y-4">
            <TicketIcon className="h-16 w-16 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold">No {activeTab} bets</h3>
            <p>Your {activeTab} bets will appear here.</p>
         </div>
      ) : (
        <div className="space-y-4">
            {filteredBets.map((bet) => (
              <BetHistoryCard
                key={bet.id}
                bet={bet}
                onCashOut={handleCashOut}
                onDownloadFail={() => addToast('Could not generate the receipt. Please try again.', 'error')}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default MyBetsScreen;