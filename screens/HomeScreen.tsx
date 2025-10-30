import React, { useState, useMemo, useEffect } from 'react';
import { LeagueSelector } from '../components/LeagueSelector';
import { MatchList } from '../components/MatchList';
import { StandingsTable } from '../components/StandingsTable';
import { BetSlip } from '../components/BetSlip';
import { PromoSection } from '../components/PromoSection';
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

  const promos = [
    {
      id: '1',
      imageUrl: '/assets/promo/promo1.png',
      altText: 'We Form Winners - Match Day Live Streaming',
      link: '/live'
    },
    {
      id: '2',
      imageUrl: '/assets/promo/promo2.png',
      altText: 'Sport Betting - Multiple Sports Available',
      link: '/sports'
    },
    {
      id: '3',
      imageUrl: '/assets/promo/promo3.png',
      altText: 'A Revolution in Online Betting - Fast & Secure',
      link: '/about'
    }
  ];

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
  
  return (
    <div className="py-6 space-y-8">
      <PromoSection promos={promos} />

      <div className="bg-white dark:bg-neutral-dark-gray rounded-2xl shadow-xl p-4 sm:p-6">
        <div className="flex items-center space-x-4 mb-6 pb-6 border-b-2 border-gray-100 dark:border-gray-700">
          {selectedLeague ? (
            <img src={selectedLeague.logo} alt={`${selectedLeague.name} logo`} className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
          ) : (
            <SoccerBallIcon className="h-16 w-16 text-gray-400" />
          )}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold dark:text-white">{selectedLeague?.name}</h1>
            <p className="text-gray-500 dark:text-white/70 text-base">{selectedLeague?.country}</p>
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
          <div className="flex border-b-2 border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('matches')}
              className={`py-3 px-6 font-bold text-lg transition-colors duration-300 ${activeTab === 'matches' ? 'text-primary border-b-4 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`py-3 px-6 font-bold text-lg transition-colors duration-300 ${activeTab === 'standings' ? 'text-primary border-b-4 border-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}
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