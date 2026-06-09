export interface User {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  photoURL: string;
  isVerified: boolean;
}

export interface Team {
  id: string;
  name: string;
  logo: string;
}

export interface Outcome {
  code: string;  // stored on the bet, e.g. "1", "OU_2.5_OVER", "BTTS_YES"
  label: string; // e.g. "Over 2.5 Goals"
  odds: number;
}

export interface Market {
  key: string;   // "1X2", "OU", "BTTS", "FH_OU"
  label: string; // "Match Result", "Total Goals", ...
  outcomes: Outcome[];
}

export interface Match {
  id: string;
  leagueId: string;
  date: string;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  homeTeam: Team;
  awayTeam: Team;
  score?: {
    home: number;
    away: number;
  };
  halfTimeScore?: {
    home: number;
    away: number;
  };
  time?: string; // e.g., 'HT', 'FT', '68''
  odds: {
    homeWin: number; // 1
    draw: number; // X
    awayWin: number; // 2
  };
  markets?: Market[];
}

export interface Standing {
  rank: number;
  team: Team;
  played: number;
  win: number;
  draw: number;
  loss: number;
  points: number;
  goalDifference: number;
}

export interface League {
    id: string;
    name: string;
    country: string;
    logo: string;
}

export interface BetSelection {
    matchId: string;
    matchDescription: string;
    marketLabel: string; // e.g. "Over 2.5 Goals", "Draw"
    market: string;      // outcome code: "1" | "X" | "2" | "OU_2.5_OVER" | ...
    odds: number;
}

export interface Bet {
    selection: BetSelection;
    wager: number;
}

export interface PlacedBet extends Bet {
  id: string;
  placedDate: string;
  status: 'PENDING' | 'WON' | 'LOST';
  payout?: number;
  isMulti?: boolean;
  selections?: BetSelection[];
  multiplier?: number;
  winBoost?: number;
}

export interface Transaction {
  id: string;
  type: 'Wager' | 'Payout' | 'Top-up' | 'Withdrawal';
  amount: number;
  description: string;
  date: string;
}