import React, { useState, useMemo, useEffect } from 'react';
import { LeagueSelector } from '../components/LeagueSelector';
import { MatchList } from '../components/MatchList';
import { StandingsTable } from '../components/StandingsTable';
import { BetSlip } from '../components/BetSlip';
import { BetPlacedModal, type BetPlacedInfo } from '../components/BetPlacedModal';
import { MarketsModal } from '../components/MarketsModal';
import { PromoBanner } from '../components/PromoBanner';
import { SoccerBallIcon, TicketIcon } from '../components/icons';
import { MatchListSkeleton, RowsSkeleton } from '../components/common/Skeleton';
import { fetchLeagues, fetchMatches, fetchStandings } from '../services/api';
import type { League, Match, Standing, BetSelection, Outcome } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppOutlet } from '../hooks/useAppOutlet';

const HomeScreen: React.FC = () => {
  const { wallet, addToast } = useAppOutlet();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [matchesForLeague, setMatchesForLeague] = useState<Match[]>([]);
  const [standingsForLeague, setStandingsForLeague] = useState<Standing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'standings'>('matches');
  const [isBetSlipOpen, setIsBetSlipOpen] = useState(false);
  const [placed, setPlaced] = useState<BetPlacedInfo | null>(null);
  const [marketsMatch, setMarketsMatch] = useState<Match | null>(null);
  const { isLoggedIn, isVerified } = useAuth();
  const navigate = useNavigate();

  const { betSlip, addToBetSlip, removeFromBetSlip, updateWager, placeBet, clearBetSlip } = wallet;

  useEffect(() => {
    if (betSlip.length > 0) {
      setIsBetSlipOpen(true);
    }
  }, [betSlip.length]);

  // Load the list of leagues once on mount and select the first one.
  useEffect(() => {
    let active = true;
    fetchLeagues().then(data => {
      if (!active) return;
      setLeagues(data);
      setSelectedLeagueId(prev => prev || data[0]?.id || '');
    });
    return () => { active = false; };
  }, []);

  // Load matches + standings whenever the selected league changes. Matches are
  // polled every 30s so live scores and in-play odds stay fresh.
  useEffect(() => {
    if (!selectedLeagueId) return;
    let active = true;

    const loadStandings = () => fetchStandings(selectedLeagueId).then(s => { if (active) setStandingsForLeague(s); });
    const loadMatches = () => fetchMatches(selectedLeagueId).then(m => { if (active) setMatchesForLeague(m); });

    setIsLoading(true);
    Promise.all([loadMatches(), loadStandings()]).finally(() => { if (active) setIsLoading(false); });

    const interval = setInterval(loadMatches, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [selectedLeagueId]);

  const selectedLeague = useMemo(() => leagues.find(l => l.id === selectedLeagueId), [leagues, selectedLeagueId]);

  // Map of matchId -> selected outcome code, used to highlight active buttons.
  const selections = useMemo(
    () => Object.fromEntries(betSlip.map(b => [b.selection.matchId, b.selection.market])) as Record<string, string>,
    [betSlip],
  );

  // Guests can freely build a bet slip; auth is enforced at placement.
  const addSelection = (match: Match, code: string, label: string, odds: number) => {
    const selection: BetSelection = {
      matchId: match.id,
      matchDescription: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
      marketLabel: label,
      market: code,
      odds,
    };
    addToBetSlip(selection);
  };

  const handleSelectOdd = (match: Match, market: '1' | 'X' | '2', odd: number) => {
    const label = market === '1' ? match.homeTeam.name : market === 'X' ? 'Draw' : match.awayTeam.name;
    addSelection(match, market, label, odd);
  };

  const handleSelectMarket = (match: Match, outcome: Outcome) => {
    addSelection(match, outcome.code, outcome.label, outcome.odds);
    setMarketsMatch(null);
  };

  const handlePlaceBet = async () => {
    if (!isLoggedIn) {
      addToast('Log in to place your bet.', 'info');
      navigate('/login');
      return;
    }
    if (!isVerified) {
      addToast('Verify your account to place a bet.', 'info');
      navigate('/kyc');
      return;
    }
    // Capture totals before placeBet clears the slip, for the success screen.
    const count = betSlip.length;
    const stake = betSlip.reduce((s, b) => s + b.wager, 0);
    const payout = betSlip.reduce((s, b) => s + b.wager * b.selection.odds, 0);
    if (stake > wallet.balance) {
      addToast('Insufficient balance — top up to continue.', 'error');
      navigate('/wallet');
      return;
    }
    const result = await placeBet();
    if (result.success) {
      setIsBetSlipOpen(false);
      setPlaced({ count, stake, payout });
    } else {
      addToast(result.message, 'error');
    }
  }
  
  const betSlipProps = {
    bets: betSlip,
    balance: wallet.balance,
    onRemove: removeFromBetSlip,
    onWagerChange: updateWager,
    onPlaceBet: handlePlaceBet,
    onClear: clearBetSlip,
    onClose: () => setIsBetSlipOpen(false),
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
      {/* Main column */}
      <div className="space-y-5">
        <PromoBanner />

        <div className="bg-white dark:bg-neutral-dark-gray rounded-2xl border border-gray-200 dark:border-neutral-border p-3 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            {selectedLeague ? (
              <img src={selectedLeague.logo} alt={`${selectedLeague.name} logo`} className="h-9 w-9 object-contain" />
            ) : (
              <SoccerBallIcon className="h-9 w-9 text-gray-400" />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">{selectedLeague?.name || 'Football'}</h1>
              <p className="text-gray-400 text-xs">{selectedLeague?.country}</p>
            </div>
          </div>

          {leagues.length > 1 && (
            <LeagueSelector
              leagues={leagues}
              selectedLeagueId={selectedLeagueId}
              setSelectedLeagueId={(id) => {
                setSelectedLeagueId(id);
                setActiveTab('matches');
              }}
            />
          )}

          <div className="mt-2">
            <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-border">
              {(['matches', 'standings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2.5 px-4 text-sm font-bold capitalize transition-colors ${
                    activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="mt-4">
              {isLoading ? (
                activeTab === 'standings'
                  ? <RowsSkeleton rows={8} />
                  : <MatchListSkeleton />
              ) : (
                <>
                  {activeTab === 'matches' && <MatchList matches={matchesForLeague} onSelectOdd={handleSelectOdd} onOpenMarkets={setMarketsMatch} selections={selections} />}
                  {activeTab === 'standings' && <StandingsTable standings={standingsForLeague} />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop bet-slip rail */}
      <div className="hidden lg:block lg:sticky lg:top-20">
        <BetSlip {...betSlipProps} variant="rail" />
      </div>

      {/* Mobile floating "view bet slip" button */}
      {betSlip.length > 0 && !isBetSlipOpen && (
        <button
          onClick={() => setIsBetSlipOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 flex items-center gap-2 bg-primary text-white font-bold px-4 py-3 rounded-full shadow-lg"
        >
          <TicketIcon className="h-5 w-5" />
          Bet Slip
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs bg-white text-primary rounded-full">{betSlip.length}</span>
        </button>
      )}

      {/* Mobile bet-slip modal */}
      {isBetSlipOpen && <BetSlip {...betSlipProps} variant="modal" />}

      {/* Bet placed success screen */}
      {placed && <BetPlacedModal info={placed} onClose={() => setPlaced(null)} />}

      {/* Full market board for a match */}
      {marketsMatch && (
        <MarketsModal
          match={marketsMatch}
          selectedCode={selections[marketsMatch.id]}
          onSelect={handleSelectMarket}
          onClose={() => setMarketsMatch(null)}
        />
      )}
    </div>
  );
}

export default HomeScreen;