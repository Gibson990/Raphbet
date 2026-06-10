import React, { useState, useMemo, useEffect } from 'react';
import { LeagueSelector } from '../components/LeagueSelector';
import { MatchList } from '../components/MatchList';
import { StandingsTable } from '../components/StandingsTable';
import { BetSlip } from '../components/BetSlip';
import { BetPlacedModal, type BetPlacedInfo } from '../components/BetPlacedModal';
import { ResultModal } from '../components/common/ResultModal';
import { MarketsModal } from '../components/MarketsModal';
import { PromoBanner } from '../components/PromoBanner';
import { SoccerBallIcon, TicketIcon } from '../components/icons';
import { MatchListSkeleton, RowsSkeleton } from '../components/common/Skeleton';
import { fetchLeagues, fetchMatches, fetchStandings } from '../services/api';
import { winBoostPercent } from '../services/accaBoost';
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
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [marketsMatch, setMarketsMatch] = useState<Match | null>(null);
  const { isLoggedIn, isVerified } = useAuth();
  const navigate = useNavigate();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'FINISHED'>('ALL');

  const filteredMatches = useMemo(() => {
    return matchesForLeague.filter(m => {
      const matchSearch =
        m.homeTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.awayTeam.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === 'ALL') return true;
      return m.status === statusFilter;
    });
  }, [matchesForLeague, searchQuery, statusFilter]);

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

  const handlePlaceBet = async (isMulti?: boolean, multiWager?: number) => {
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
    const stake = isMulti ? (multiWager || 0) : betSlip.reduce((s, b) => s + b.wager, 0);
    const combinedMultiplier = betSlip.reduce((prod, b) => prod * b.selection.odds, 1);
    const boostPercent = winBoostPercent(count);
    const payout = isMulti
      ? (multiWager || 0) * combinedMultiplier * (1 + boostPercent / 100)
      : betSlip.reduce((s, b) => s + b.wager * b.selection.odds, 0);

    if (stake > wallet.balance) {
      addToast('Insufficient balance — top up to continue.', 'error');
      navigate('/wallet');
      return;
    }
    const result = await placeBet(isMulti, multiWager);
    if (result.success) {
      setIsBetSlipOpen(false);
      setPlaced({ count, stake, payout });
    } else {
      setIsBetSlipOpen(false);
      setPlaceError(result.message);
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

        <div id="match-board" className="bg-white dark:bg-neutral-dark-gray rounded-2xl border border-gray-200 dark:border-neutral-border p-3 sm:p-5 scroll-mt-20">
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
            {activeTab === 'matches' && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-gray-100 dark:border-neutral-border/50 pb-4">
                {/* Search Bar */}
                <div className="relative flex-grow max-w-md">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Search matches by team name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-light-gray dark:bg-neutral-dark border border-gray-200 dark:border-neutral-border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-neutral-dark dark:text-neutral-light-gray animate-fade-in"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1">
                  {(['ALL', 'LIVE', 'UPCOMING', 'FINISHED'] as const).map((filter) => {
                    const isActive = statusFilter === filter;
                    const labelMap = {
                      ALL: 'All Matches',
                      LIVE: '🔴 Live',
                      UPCOMING: 'Upcoming',
                      FINISHED: 'Finished',
                    };
                    return (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap border ${
                          isActive
                            ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25 scale-[1.03]'
                            : 'bg-white dark:bg-neutral-dark-gray border-gray-200 dark:border-neutral-border text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-[1.02]'
                        }`}
                      >
                        {labelMap[filter]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              {isLoading ? (
                activeTab === 'standings'
                  ? <RowsSkeleton rows={8} />
                  : <MatchListSkeleton />
              ) : (
                <>
                  {activeTab === 'matches' && (
                    filteredMatches.length === 0 ? (
                      <div className="w-full text-center py-12 bg-gray-50 dark:bg-neutral-dark border border-dashed border-gray-200 dark:border-neutral-border rounded-2xl">
                        <p className="text-sm text-gray-400">No matches found matching your filters.</p>
                      </div>
                    ) : (
                      <MatchList matches={filteredMatches} onSelectOdd={handleSelectOdd} onOpenMarkets={setMarketsMatch} selections={selections} />
                    )
                  )}
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

      {/* Bet failed screen */}
      {placeError && (
        <ResultModal
          variant="error"
          title="Bet not placed"
          message={placeError}
          primaryLabel="Try again"
          onPrimary={() => { setPlaceError(null); setIsBetSlipOpen(true); }}
          secondaryLabel="Close"
          onSecondary={() => setPlaceError(null)}
          onClose={() => setPlaceError(null)}
        />
      )}

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