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
 * Live football data — leagues, fixtures, live scores and standings — all served
 * by the backend (which proxies api-football). There is no hardcoded data on the
 * client: on error the calls resolve to empty lists and the UI shows empty states.
 */
export async function fetchLeagues(): Promise<League[]> {
  try {
    return await getJSON<League[]>('/api/leagues');
  } catch (err) {
    console.warn('fetchLeagues failed:', err);
    return [];
  }
}

export async function fetchMatches(leagueId: string): Promise<Match[]> {
  try {
    return await getJSON<Match[]>(`/api/leagues/${leagueId}/matches`);
  } catch (err) {
    console.warn('fetchMatches failed:', err);
    return [];
  }
}

export async function fetchStandings(leagueId: string): Promise<Standing[]> {
  try {
    return await getJSON<Standing[]>(`/api/leagues/${leagueId}/standings`);
  } catch (err) {
    console.warn('fetchStandings failed:', err);
    return [];
  }
}
