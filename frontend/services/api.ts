import type { League, Match, Standing } from '../types';

// Base URL of the Raphbet backend. Configure via VITE_API_BASE_URL in .env;
// defaults to the local dev server.
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080';

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Live football data, fetched from the backend (which proxies api-football and
 * keeps the API key secret). If the backend is unreachable we fall back to a
 * small offline World Cup sample so the UI still renders during development.
 */
export async function fetchLeagues(): Promise<League[]> {
  try {
    return await getJSON<League[]>('/api/leagues');
  } catch (err) {
    console.warn('fetchLeagues: falling back to offline sample —', err);
    return FALLBACK_LEAGUES;
  }
}

export async function fetchMatches(leagueId: string): Promise<Match[]> {
  try {
    return await getJSON<Match[]>(`/api/leagues/${leagueId}/matches`);
  } catch (err) {
    console.warn('fetchMatches: falling back to offline sample —', err);
    return FALLBACK_MATCHES[leagueId] ?? [];
  }
}

export async function fetchStandings(leagueId: string): Promise<Standing[]> {
  try {
    return await getJSON<Standing[]>(`/api/leagues/${leagueId}/standings`);
  } catch (err) {
    console.warn('fetchStandings: falling back to offline sample —', err);
    return FALLBACK_STANDINGS[leagueId] ?? [];
  }
}

// ---- Offline fallback sample (used only when the backend is unreachable) ----

const flag = (code: string) => `https://flagcdn.com/w160/${code}.png`;

const FALLBACK_LEAGUES: League[] = [
  { id: '1', name: 'FIFA World Cup', country: 'World', logo: 'https://media.api-sports.io/football/leagues/1.png' },
];

const FALLBACK_MATCHES: { [leagueId: string]: Match[] } = {
  '1': [
    {
      id: 'WC-UP-1', leagueId: '1', date: '2026-06-12T19:00:00Z', status: 'UPCOMING',
      homeTeam: { id: 'ARG', name: 'Argentina', logo: flag('ar') },
      awayTeam: { id: 'ENG', name: 'England', logo: flag('gb-eng') },
      odds: { homeWin: 2.10, draw: 3.40, awayWin: 3.30 },
    },
    {
      id: 'WC-UP-2', leagueId: '1', date: '2026-06-12T22:00:00Z', status: 'UPCOMING',
      homeTeam: { id: 'FRA', name: 'France', logo: flag('fr') },
      awayTeam: { id: 'GER', name: 'Germany', logo: flag('de') },
      odds: { homeWin: 2.30, draw: 3.30, awayWin: 3.00 },
    },
  ],
};

const FALLBACK_STANDINGS: { [leagueId: string]: Standing[] } = {
  '1': [
    { rank: 1, team: { id: 'ARG', name: 'Argentina', logo: flag('ar') }, played: 2, win: 2, draw: 0, loss: 0, points: 6, goalDifference: 4 },
    { rank: 2, team: { id: 'FRA', name: 'France', logo: flag('fr') }, played: 2, win: 1, draw: 1, loss: 0, points: 4, goalDifference: 2 },
  ],
};
