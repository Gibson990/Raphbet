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
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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

  // Re-runs the league + match effects after a failed load (or a manual refresh).
  const retryLoad = () => {
    setLoadError(false);
    setIsLoading(true);
    setRetryKey(k => k + 1);
  };

  // Load the list of leagues on mount (and on retry) and select the first one.
  useEffect(() => {
    let active = true;
    fetchLeagues()
      .then(data => {
        if (!active) return;
        setLeagues(data);
        setSelectedLeagueId(prev => prev || data[0]?.id || '');
        if (data.length === 0) setIsLoading(false); // nothing further to load
      })
      .catch(() => {
        // Without an error state the board would show skeletons forever.
        if (active) { setLoadError(true); setIsLoading(false); }
      });
    return () => { active = false; };
  }, [retryKey]);

  // Load matches + standings whenever the selected league changes. Matches are
  // polled every 30s so live scores and in-play odds stay fresh.
  useEffect(() => {
    if (!selectedLeagueId) return;
    let active = true;

    const loadStandings = () => fetchStandings(selectedLeagueId).then(s => { if (active) setStandingsForLeague(s); });
    const loadMatches = () => fetchMatches(selectedLeagueId).then(m => {
      if (active) { setMatchesForLeague(m); setLastUpdated(new Date()); setLoadError(false); }
    });

    setIsLoading(true);
    Promise.all([loadMatches(), loadStandings()])
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setIsLoading(false); });

    // A transient poll failure keeps showing the last good data — no error flash.
    const interval = setInterval(() => loadMatches().catch(() => {}), 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [selectedLeagueId, retryKey]);

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

        {/* League filter — directly below the slide view, wraps (no side-scroll). */}
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

        <div id="match-board" className="bg-white dark:bg-neutral-dark-gray rounded-2xl border border-gray-200 dark:border-neutral-border p-3 sm:p-5 scroll-mt-20">
          <div className="flex items-center gap-3 mb-4">
            {selectedLeague ? (
              <img src={selectedLeague.logo} alt={`${selectedLeague.name} logo`} className="h-9 w-9 object-contain" />
            ) : (
              <SoccerBallIcon className="h-9 w-9 text-gray-400" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold leading-tight truncate">{selectedLeague?.name || 'Football'}</h1>
              <p className="text-gray-400 text-xs">{selectedLeague?.country}</p>
            </div>
            <button
              onClick={retryLoad}
              title="Refresh odds"
              className="ml-auto shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 hover:text-primary transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Refresh'}</span>
            </button>
          </div>

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
                      LIVE: 'Live',
                      UPCOMING: 'Upcoming',
                      FINISHED: 'Finished',
                    };
                    return (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap border inline-flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25 scale-[1.03]'
                            : 'bg-white dark:bg-neutral-dark-gray border-gray-200 dark:border-neutral-border text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:scale-[1.02]'
                        }`}
                      >
                        {filter === 'LIVE' && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'bg-white' : 'bg-live'}`} />
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-white' : 'bg-live'}`} />
                          </span>
                        )}
                        {labelMap[filter]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              {loadError && matchesForLeague.length === 0 ? (
                <div className="w-full text-center py-14 bg-gray-50 dark:bg-neutral-dark border border-dashed border-gray-200 dark:border-neutral-border rounded-2xl">
                  <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="font-bold text-gray-600 dark:text-gray-300">Can't reach the server</p>
                  <p className="text-sm text-gray-400 mt-1">Check your connection and try again.</p>
                  <button
                    onClick={retryLoad}
                    className="mt-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : isLoading ? (
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