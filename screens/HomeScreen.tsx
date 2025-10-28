import React, { useState, useMemo, useEffect } from 'react';
import { LeagueSelector } from '../components/LeagueSelector';
import { MatchList } from '../components/MatchList';
import { StandingsTable } from '../components/StandingsTable';
import { BetSlip } from '../components/BetSlip';
import { Carousel } from '../components/common/Carousel';
import { SoccerBallIcon } from '../components/icons';
import { mockLeagues, mockMatches, mockStandings } from '../services/api';
import type { League, Match, BetSelection } from '../types';
import type { UseVirtualWalletReturn } from '../hooks/useVirtualWallet';
import { useAuth } from '../contexts/AuthContext';
import { ToastMessage } from '../App';

interface HomeScreenProps {
  wallet: UseVirtualWalletReturn;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ wallet, addToast }) => {
  const [leagues] = useState<League[]>(mockLeagues);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(leagues[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'matches' | 'standings'>('matches');
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);
  const { isVerified } = useAuth();

  const { betSlip, addToBetSlip, removeFromBetSlip, updateWager, placeBet, clearBetSlip } = wallet;

  useEffect(() => {
    if (betSlip.length > 0) {
      setIsBetSlipOpen(true);
    }
  }, [betSlip.length]);

  const selectedLeague = useMemo(() => leagues.find(l => l.id === selectedLeagueId), [leagues, selectedLeagueId]);
  const matchesForLeague = useMemo(() => mockMatches[selectedLeagueId] || [], [selectedLeagueId]);
  const standingsForLeague = useMemo(() => mockStandings[selectedLeagueId] || [], [selectedLeagueId]);

  const handleSelectOdd = (match: Match, market: '1' | 'X' | '2', odd: number) => {
    if (!isVerified) {
        addToast('Please verify your account to place a bet.', 'error');
        return;
    }
    const selection: BetSelection = {
      matchId: match.id,
      matchDescription: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      marketLabel: market === '1' ? match.homeTeam.name : market === 'X' ? 'Draw' : match.awayTeam.name,
      market,
      odds: odd,
    };
    addToBetSlip(selection);
  };

  const handlePlaceBet = () => {
    if (!isVerified) {
        addToast('Please verify your account to place a bet.', 'error');
        return;
    }
    const result = placeBet();
    if (result.success) {
      addToast(result.message, 'success');
      setIsBetSlipOpen(false);
    } else {
      addToast(result.message, 'error');
    }
  }
  
  const promoImages = [
    'https://www.the-sun.com/wp-content/uploads/sites/6/2023/08/espn-bet-official-launch-date-new-788079712-1.png',
    'https://www.legalsportsreport.com/wp-content/uploads/2019/09/FanDuel-Sportsbook-PA-promo.jpg',
    'https://www.sportsbusinessjournal.com/-/media/Images/Daily/2023/11/14/ESPN-Bet.ashx',
  ];

  return (
    <div className="py-4 space-y-6">
      <Carousel images={promoImages} />

      <div className="bg-neutral-light dark:bg-neutral-dark-gray rounded-xl shadow-lg p-2 sm:p-4">
        <div className="flex items-center space-x-4 mb-4 pb-4">
          {selectedLeague ? (
            <img src={selectedLeague.logo} alt={`${selectedLeague.name} logo`} className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
          ) : (
            <SoccerBallIcon className="h-12 w-12 text-gray-400" />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{selectedLeague?.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{selectedLeague?.country}</p>
          </div>
        </div>

        <LeagueSelector
          leagues={leagues}
          selectedLeagueId={selectedLeagueId}
          setSelectedLeagueId={(id) => {
            setSelectedLeagueId(id);
            setActiveTab('matches');
          }}
        />

        <div className="mt-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('matches')}
              className={`py-2 px-4 font-semibold ${activeTab === 'matches' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`py-2 px-4 font-semibold ${activeTab === 'standings' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Standings
            </button>
          </div>
          <div className="mt-4">
            {activeTab === 'matches' && <MatchList matches={matchesForLeague} onSelectOdd={handleSelectOdd} />}
            {activeTab === 'standings' && <StandingsTable standings={standingsForLeague} />}
          </div>
        </div>
      </div>
      
      {isBetSlipOpen && (
        <BetSlip 
          bets={betSlip}
          onRemove={removeFromBetSlip}
          onWagerChange={updateWager}
          onPlaceBet={handlePlaceBet}
          onClear={clearBetSlip}
          onClose={() => setIsBetSlipOpen(false)}
        />
      )}
    </div>
  );
}

export default HomeScreen;