import { Match, StandingGroup, H2HAggregates } from "@/lib/types/football";

// All providers must implement this interface.
// Each league config picks a provider; the router calls the matching one.

export interface FootballProvider {
  name: string;

  getUpcomingMatches(leagueRef: LeagueRef, daysAhead?: number): Promise<Match[]>;
  getStandings(leagueRef: LeagueRef): Promise<StandingGroup[]>;
  getTeamMatches(teamId: number, leagueRef: LeagueRef, limit?: number): Promise<Match[]>;
  getTeamUpcoming(teamId: number, leagueRef: LeagueRef, limit?: number): Promise<Match[]>;
  getMatchById(matchId: number, leagueRef: LeagueRef): Promise<Match | null>;
  getH2H?(matchId: number, leagueRef: LeagueRef, limit?: number): Promise<{
    aggregates: H2HAggregates | null;
    matches: Match[];
  }>;
}

// Each provider needs different identifiers — football-data.org uses string codes,
// API-Football uses numeric IDs. This carries both so the router can pass them along.
export interface LeagueRef {
  provider: "football-data" | "api-football";
  code: string;        // e.g. "PL", "PD"
  apiFootballId?: number; // e.g. 39 for PL on API-Football
  season?: number;       // for API-Football, which requires explicit season
}
