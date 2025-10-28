import type { League, Match, Standing, Team } from '../types';

const teams: { [key: string]: Team } = {
  // Premier League
  'MUN': { id: 'MUN', name: 'Manchester United', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/360.png' },
  'MCI': { id: 'MCI', name: 'Manchester City', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png' },
  'LIV': { id: 'LIV', name: 'Liverpool', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/364.png' },
  'ARS': { id: 'ARS', name: 'Arsenal', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png' },
  'CHE': { id: 'CHE', name: 'Chelsea', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/363.png' },
  'TOT': { id: 'TOT', name: 'Tottenham Hotspur', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png' },

  // La Liga
  'FCB': { id: 'FCB', name: 'FC Barcelona', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/83.png' },
  'RMA': { id: 'RMA', name: 'Real Madrid', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png' },
  'ATM': { id: 'ATM', name: 'Atlético Madrid', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png' },
  'SEV': { id: 'SEV', name: 'Sevilla FC', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/94.png' },
};

export const mockLeagues: League[] = [
  { id: 'PL', name: 'Premier League', country: 'England', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png' },
  { id: 'LL', name: 'La Liga', country: 'Spain', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png' },
];

export const mockMatches: { [leagueId: string]: Match[] } = {
  'PL': [
    { id: 'PLM1', leagueId: 'PL', date: '2024-09-21T14:00:00Z', status: 'UPCOMING', homeTeam: teams['MUN'], awayTeam: teams['LIV'], odds: { homeWin: 2.50, draw: 3.40, awayWin: 2.80 } },
    { id: 'PLM2', leagueId: 'PL', date: '2024-09-21T16:30:00Z', status: 'UPCOMING', homeTeam: teams['ARS'], awayTeam: teams['TOT'], odds: { homeWin: 1.90, draw: 3.60, awayWin: 4.00 } },
    { id: 'PLM3', leagueId: 'PL', date: '2024-09-20T19:00:00Z', status: 'LIVE', homeTeam: teams['MCI'], awayTeam: teams['CHE'], score: { home: 1, away: 1 }, time: '72', odds: { homeWin: 1.50, draw: 2.20, awayWin: 5.50 } },
    { id: 'PLM4', leagueId: 'PL', date: '2024-09-15T19:00:00Z', status: 'FINISHED', homeTeam: teams['LIV'], awayTeam: teams['ARS'], score: { home: 3, away: 1 }, time: 'FT', odds: { homeWin: 2.10, draw: 3.50, awayWin: 3.20 } },
  ],
  'LL': [
    { id: 'LLM1', leagueId: 'LL', date: '2024-09-22T19:00:00Z', status: 'UPCOMING', homeTeam: teams['RMA'], awayTeam: teams['FCB'], odds: { homeWin: 2.20, draw: 3.50, awayWin: 3.10 } },
    { id: 'LLM2', leagueId: 'LL', date: '2024-09-22T17:00:00Z', status: 'UPCOMING', homeTeam: teams['ATM'], awayTeam: teams['SEV'], odds: { homeWin: 1.80, draw: 3.30, awayWin: 4.50 } },
    { id: 'LLM3', leagueId: 'LL', date: '2024-09-16T19:00:00Z', status: 'FINISHED', homeTeam: teams['FCB'], awayTeam: teams['ATM'], score: { home: 2, away: 2 }, time: 'FT', odds: { homeWin: 1.90, draw: 3.60, awayWin: 4.00 } },
  ],
};

export const mockStandings: { [leagueId: string]: Standing[] } = {
  'PL': [
    { rank: 1, team: teams['MCI'], played: 4, win: 4, draw: 0, loss: 0, points: 12, goalDifference: 10 },
    { rank: 2, team: teams['LIV'], played: 4, win: 3, draw: 1, loss: 0, points: 10, goalDifference: 7 },
    { rank: 3, team: teams['ARS'], played: 4, win: 3, draw: 0, loss: 1, points: 9, goalDifference: 5 },
    { rank: 4, team: teams['TOT'], played: 4, win: 2, draw: 2, loss: 0, points: 8, goalDifference: 4 },
    { rank: 5, team: teams['CHE'], played: 4, win: 2, draw: 1, loss: 1, points: 7, goalDifference: 2 },
    { rank: 6, team: teams['MUN'], played: 4, win: 2, draw: 0, loss: 2, points: 6, goalDifference: 0 },
  ],
  'LL': [
    { rank: 1, team: teams['RMA'], played: 3, win: 3, draw: 0, loss: 0, points: 9, goalDifference: 8 },
    { rank: 2, team: teams['FCB'], played: 3, win: 2, draw: 1, loss: 0, points: 7, goalDifference: 5 },
    { rank: 3, team: teams['ATM'], played: 3, win: 2, draw: 0, loss: 1, points: 6, goalDifference: 3 },
    { rank: 4, team: teams['SEV'], played: 3, win: 1, draw: 1, loss: 1, points: 4, goalDifference: 1 },
  ]
};