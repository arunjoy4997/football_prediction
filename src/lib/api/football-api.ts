import { cache } from "./cache";
import { Match, StandingGroup, H2HAggregates } from "@/lib/types/football";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const BASE_URL = "https://api.football-data.org/v4";

// ─── Core fetch helper ───────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  cacheTTL = 900
): Promise<T> {
  const cacheKey = path;
  const cached = cache.get<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
    cache: "no-store",
  });

  if (res.status === 429) {
    // Rate limited — wait and retry once
    await new Promise((r) => setTimeout(r, 6000));
    const retry = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-Auth-Token": API_KEY },
      cache: "no-store",
    });
    if (!retry.ok) throw new Error(`API error ${retry.status}`);
    const data = await retry.json();
    cache.set(cacheKey, data, cacheTTL);
    return data;
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  cache.set(cacheKey, data, cacheTTL);
  return data;
}

// ─── Upcoming Matches for a competition ──────────────────────────

export async function getUpcomingMatches(
  competitionCode: string,
  daysAhead = 7
): Promise<Match[]> {
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const data = await apiFetch<{ matches: Match[] }>(
    `/competitions/${competitionCode}/matches?status=SCHEDULED,TIMED&dateFrom=${from}&dateTo=${to}`,
    600
  );
  return data.matches ?? [];
}

// ─── Finished matches for a competition (recent results) ────────

export async function getRecentMatches(
  competitionCode: string,
  limit = 10
): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(
    `/competitions/${competitionCode}/matches?status=FINISHED&limit=${limit}`,
    900
  );
  return data.matches ?? [];
}

// ─── Live / in-play matches ──────────────────────────────────────

export async function getLiveMatches(): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(
    `/matches?status=IN_PLAY,PAUSED`,
    60
  );
  return data.matches ?? [];
}

// ─── Standings ───────────────────────────────────────────────────

export async function getStandings(
  competitionCode: string
): Promise<StandingGroup[]> {
  const data = await apiFetch<{ standings: StandingGroup[] }>(
    `/competitions/${competitionCode}/standings`,
    1800
  );
  return data.standings ?? [];
}

// ─── Head to Head ────────────────────────────────────────────────

export async function getH2H(
  matchId: number,
  limit = 10
): Promise<{ aggregates: H2HAggregates; matches: Match[] }> {
  const data = await apiFetch<{
    aggregates: H2HAggregates;
    matches: Match[];
  }>(`/matches/${matchId}/head2head?limit=${limit}`, 3600);
  return { aggregates: data.aggregates, matches: data.matches ?? [] };
}

// ─── Team recent matches ────────────────────────────────────────

export async function getTeamMatches(
  teamId: number,
  status: "FINISHED" | "SCHEDULED" = "FINISHED",
  limit = 10
): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(
    `/teams/${teamId}/matches?status=${status}&limit=${limit}`,
    900
  );
  return data.matches ?? [];
}

// ─── Team upcoming matches (for rotation detection) ─────────────

export async function getTeamUpcoming(
  teamId: number,
  limit = 5
): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(
    `/teams/${teamId}/matches?status=SCHEDULED,TIMED&limit=${limit}`,
    600
  );
  return data.matches ?? [];
}

// ─── Single match by ID ─────────────────────────────────────────

export async function getMatchById(matchId: number): Promise<Match | null> {
  try {
    const data = await apiFetch<Match>(`/matches/${matchId}`, 600);
    return data;
  } catch {
    return null;
  }
}
