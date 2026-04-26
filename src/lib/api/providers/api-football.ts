import { cache } from "../cache";
import { Match, StandingGroup, StandingEntry } from "@/lib/types/football";
import { FootballProvider, LeagueRef } from "./types";

const API_KEY = process.env.API_FOOTBALL_KEY || "";
const BASE_URL = "https://v3.football.api-sports.io";

// ─── Daily quota tracker ──────────────────────────────────────────
// Free tier = 100 req/day. We track usage to fail gracefully when exhausted.

class DailyQuotaTracker {
  private requestsToday = 0;
  private resetTime = new Date().setUTCHours(24, 0, 0, 0); // next UTC midnight
  private readonly limit = 95; // headroom

  canFetch(): boolean {
    if (Date.now() >= this.resetTime) {
      this.requestsToday = 0;
      this.resetTime = new Date().setUTCHours(24, 0, 0, 0);
    }
    return this.requestsToday < this.limit;
  }

  consume(): void {
    this.requestsToday++;
  }

  remaining(): number {
    return Math.max(0, this.limit - this.requestsToday);
  }
}

const quota = new DailyQuotaTracker();

// ─── Raw API response shapes ──────────────────────────────────────

interface APIFixtureResponse {
  fixture: {
    id: number;
    date: string;
    timestamp: number;
    venue: { id: number | null; name: string; city: string };
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

// Map API-Football's nested shape to our flat Match type
function mapFixture(raw: APIFixtureResponse): Match {
  const status = raw.fixture.status.short;
  let mappedStatus: Match["status"];
  if (status === "NS" || status === "TBD") mappedStatus = "SCHEDULED";
  else if (status === "1H" || status === "2H" || status === "ET" || status === "P" || status === "BT") mappedStatus = "IN_PLAY";
  else if (status === "HT") mappedStatus = "PAUSED";
  else if (status === "FT" || status === "AET" || status === "PEN") mappedStatus = "FINISHED";
  else if (status === "PST") mappedStatus = "POSTPONED";
  else if (status === "CANC") mappedStatus = "CANCELLED";
  else if (status === "SUSP" || status === "INT") mappedStatus = "SUSPENDED";
  else mappedStatus = "SCHEDULED";

  // Determine winner
  const fh = raw.score.fulltime.home;
  const fa = raw.score.fulltime.away;
  let winner: Match["score"]["winner"] = null;
  if (mappedStatus === "FINISHED" && fh !== null && fa !== null) {
    if (fh > fa) winner = "HOME_TEAM";
    else if (fa > fh) winner = "AWAY_TEAM";
    else winner = "DRAW";
  }

  // Extract matchday number from round string (e.g. "Regular Season - 17" → 17)
  const mdMatch = raw.league.round?.match(/(\d+)$/);
  const matchday = mdMatch ? parseInt(mdMatch[1]) : null;

  return {
    id: raw.fixture.id,
    utcDate: raw.fixture.date,
    status: mappedStatus,
    matchday,
    stage: raw.league.round || "REGULAR_SEASON",
    group: null,
    lastUpdated: raw.fixture.date,
    homeTeam: {
      id: raw.teams.home.id,
      name: raw.teams.home.name,
      shortName: raw.teams.home.name,
      tla: raw.teams.home.name.slice(0, 3).toUpperCase(),
      crest: raw.teams.home.logo,
    },
    awayTeam: {
      id: raw.teams.away.id,
      name: raw.teams.away.name,
      shortName: raw.teams.away.name,
      tla: raw.teams.away.name.slice(0, 3).toUpperCase(),
      crest: raw.teams.away.logo,
    },
    score: {
      winner,
      duration: "REGULAR",
      fullTime: { home: fh, away: fa },
      halfTime: { home: raw.score.halftime.home, away: raw.score.halftime.away },
    },
    competition: {
      id: raw.league.id,
      name: raw.league.name,
      code: leagueCodeFromId(raw.league.id),
      type: "LEAGUE",
      emblem: raw.league.logo,
    },
    area: {
      id: 0,
      name: raw.league.country,
      code: raw.league.country.slice(0, 3).toUpperCase(),
      flag: null,
    },
    season: {
      id: raw.league.season,
      startDate: "",
      endDate: "",
      currentMatchday: matchday ?? 0,
    },
    referees: [],
  };
}

// Map league IDs back to codes (only known leagues)
function leagueCodeFromId(id: number): string {
  const map: Record<number, string> = {
    128: "ARG",  // Argentina Liga Profesional
    253: "MLS",  // Major League Soccer
    307: "SPL",  // Saudi Pro League
    323: "ISL",  // Indian Super League
  };
  return map[id] || `AF-${id}`;
}

// ─── Core fetch with retry + quota check ─────────────────────────

async function apiFetch<T>(
  endpoint: string,
  params: Record<string, string | number>,
  cacheTTL = 43200 // 12 hours default — aggressive caching for 100/day limit
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const cacheKey = `af:${endpoint}?${qs.toString()}`;

  // Fresh cache hit — skip API call entirely
  const fresh = cache.get<T>(cacheKey);
  if (fresh !== null) return fresh;

  // Check daily quota
  if (!quota.canFetch()) {
    const stale = cache.getStale<T>(cacheKey);
    if (stale.data !== null) {
      console.warn(`[api-football] Daily quota exhausted, using stale cache`);
      return stale.data;
    }
    throw new Error("API-Football daily quota exhausted (100/day). Try again after UTC midnight.");
  }

  // Try with retries
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}?${qs.toString()}`, {
        headers: { "x-apisports-key": API_KEY },
        cache: "no-store",
      });

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(`API-Football ${res.status}`);
      }

      quota.consume();
      const json = await res.json();

      if (json.errors && Object.keys(json.errors).length > 0) {
        console.warn("[api-football]", endpoint, json.errors);
      }

      cache.set(cacheKey, json, cacheTTL);
      return json;
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt)));
      }
    }
  }

  const stale = cache.getStale<T>(cacheKey);
  if (stale.data !== null) {
    console.warn(`[api-football] Using stale cache for ${endpoint}`);
    return stale.data;
  }
  throw lastError || new Error(`Failed: ${endpoint}`);
}

// ─── Provider implementation ─────────────────────────────────────

export const apiFootballProvider: FootballProvider = {
  name: "api-football",

  async getUpcomingMatches(leagueRef: LeagueRef, daysAhead = 14): Promise<Match[]> {
    if (!leagueRef.apiFootballId || !leagueRef.season) return [];

    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);

    const data = await apiFetch<{ response: APIFixtureResponse[] }>(
      "/fixtures",
      {
        league: leagueRef.apiFootballId,
        season: leagueRef.season,
        from,
        to,
      },
      3600 // 1 hour for fixtures
    );

    return (data.response ?? [])
      .filter((f) => ["NS", "TBD", "1H", "HT", "2H"].includes(f.fixture.status.short))
      .map(mapFixture);
  },

  async getStandings(leagueRef: LeagueRef): Promise<StandingGroup[]> {
    if (!leagueRef.apiFootballId || !leagueRef.season) return [];

    const data = await apiFetch<{
      response: { league: { standings: AfStandingEntry[][] } }[];
    }>(
      "/standings",
      { league: leagueRef.apiFootballId, season: leagueRef.season },
      21600 // 6 hours
    );

    if (!data.response?.[0]) return [];

    // Flatten all groups (some leagues like MLS have multiple groups/conferences)
    const flatTable: StandingEntry[] = [];
    for (const group of data.response[0].league.standings) {
      for (const entry of group) {
        flatTable.push(mapStandingEntry(entry));
      }
    }

    // Sort by points (some APIs return groups separately, but our UI wants one table)
    flatTable.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
    flatTable.forEach((e, i) => (e.position = i + 1));

    return [{ stage: "REGULAR_SEASON", type: "TOTAL", group: null, table: flatTable }];
  },

  async getTeamMatches(teamId: number, leagueRef: LeagueRef, limit = 10): Promise<Match[]> {
    if (!leagueRef.season) return [];
    const data = await apiFetch<{ response: APIFixtureResponse[] }>(
      "/fixtures",
      { team: teamId, last: limit, season: leagueRef.season },
      21600 // 6 hours — finished matches don't change
    );
    return (data.response ?? []).map(mapFixture);
  },

  async getTeamUpcoming(teamId: number, leagueRef: LeagueRef, limit = 5): Promise<Match[]> {
    if (!leagueRef.season) return [];
    const data = await apiFetch<{ response: APIFixtureResponse[] }>(
      "/fixtures",
      { team: teamId, next: limit, season: leagueRef.season },
      7200 // 2 hours
    );
    return (data.response ?? []).map(mapFixture);
  },

  async getMatchById(matchId: number): Promise<Match | null> {
    try {
      const data = await apiFetch<{ response: APIFixtureResponse[] }>(
        "/fixtures",
        { id: matchId },
        3600
      );
      const f = data.response?.[0];
      return f ? mapFixture(f) : null;
    } catch {
      return null;
    }
  },

  // H2H is optional and expensive — skip for API-Football to save quota
  // (engine handles missing H2H gracefully)
};

// ─── Standing entry mapper ───────────────────────────────────────

interface AfStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  form: string | null;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

function mapStandingEntry(raw: AfStandingEntry): StandingEntry {
  // Convert form string "WLDLW" to comma-separated for our format
  const form = raw.form ? raw.form.split("").join(",") : null;

  return {
    position: raw.rank,
    team: {
      id: raw.team.id,
      name: raw.team.name,
      shortName: raw.team.name,
      tla: raw.team.name.slice(0, 3).toUpperCase(),
      crest: raw.team.logo,
    },
    playedGames: raw.all.played,
    form,
    won: raw.all.win,
    draw: raw.all.draw,
    lost: raw.all.lose,
    points: raw.points,
    goalsFor: raw.all.goals.for,
    goalsAgainst: raw.all.goals.against,
    goalDifference: raw.goalsDiff,
  };
}

export function getApiFootballQuota(): number {
  return quota.remaining();
}
