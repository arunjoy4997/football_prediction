import { Match, StandingGroup, H2HAggregates } from "@/lib/types/football";
import { footballDataProvider } from "./providers/football-data";
import { apiFootballProvider } from "./providers/api-football";
import { LeagueRef } from "./providers/types";
import { getLeagueByCode } from "@/lib/config/leagues";

// ─── Provider router ────────────────────────────────────────────

function getProvider(provider: "football-data" | "api-football") {
  return provider === "api-football" ? apiFootballProvider : footballDataProvider;
}

function buildLeagueRef(code: string): LeagueRef {
  const league = getLeagueByCode(code);
  if (!league) {
    throw new Error(`Unknown league code: ${code}`);
  }
  return {
    provider: league.provider,
    code: league.code,
    apiFootballId: league.apiFootballId,
    season: league.season,
  };
}

// ─── Unified API ────────────────────────────────────────────────

export async function getUpcomingMatches(code: string, daysAhead = 7): Promise<Match[]> {
  const ref = buildLeagueRef(code);
  return getProvider(ref.provider).getUpcomingMatches(ref, daysAhead);
}

export async function getStandings(code: string): Promise<StandingGroup[]> {
  const ref = buildLeagueRef(code);
  return getProvider(ref.provider).getStandings(ref);
}

export async function getH2H(matchId: number, code: string, limit = 10): Promise<{
  aggregates: H2HAggregates | null;
  matches: Match[];
}> {
  const ref = buildLeagueRef(code);
  const provider = getProvider(ref.provider);
  if (!provider.getH2H) return { aggregates: null, matches: [] };
  return provider.getH2H(matchId, ref, limit);
}

export async function getTeamMatches(teamId: number, code: string, limit = 10): Promise<Match[]> {
  const ref = buildLeagueRef(code);
  return getProvider(ref.provider).getTeamMatches(teamId, ref, limit);
}

export async function getTeamUpcoming(teamId: number, code: string, limit = 5): Promise<Match[]> {
  const ref = buildLeagueRef(code);
  return getProvider(ref.provider).getTeamUpcoming(teamId, ref, limit);
}

export async function getMatchById(matchId: number, code: string): Promise<Match | null> {
  const ref = buildLeagueRef(code);
  return getProvider(ref.provider).getMatchById(matchId, ref);
}
