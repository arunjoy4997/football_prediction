import { cache } from "../cache";
import { Match, StandingGroup, H2HAggregates } from "@/lib/types/football";
import { FootballProvider, LeagueRef } from "./types";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const BASE_URL = "https://api.football-data.org/v4";

// ─── Rate limiter — 10 req/min ───────────────────────────────────

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests = 9;
  private readonly windowMs = 60_000;

  async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 100;
      await new Promise((r) => setTimeout(r, waitMs));
      return this.acquire();
    }
    this.timestamps.push(Date.now());
  }
}

const limiter = new RateLimiter();

async function apiFetch<T>(path: string, cacheTTL = 900): Promise<T> {
  const cacheKey = `fd:${path}`;
  const fresh = cache.get<T>(cacheKey);
  if (fresh !== null) return fresh;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await limiter.acquire();
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "X-Auth-Token": API_KEY },
        cache: "no-store",
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "10");
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        continue;
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error(`API ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      cache.set(cacheKey, data, cacheTTL);
      return data;
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * Math.pow(2, attempt)));
      }
    }
  }

  const stale = cache.getStale<T>(cacheKey);
  if (stale.data !== null) {
    console.warn(`[football-data] Using stale cache for ${path}`);
    return stale.data;
  }
  throw lastError || new Error(`Failed: ${path}`);
}

// ─── Provider implementation ─────────────────────────────────────

export const footballDataProvider: FootballProvider = {
  name: "football-data",

  async getUpcomingMatches(leagueRef: LeagueRef, daysAhead = 7): Promise<Match[]> {
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
    const data = await apiFetch<{ matches: Match[] }>(
      `/competitions/${leagueRef.code}/matches?status=SCHEDULED,TIMED&dateFrom=${from}&dateTo=${to}`,
      900
    );
    return data.matches ?? [];
  },

  async getStandings(leagueRef: LeagueRef): Promise<StandingGroup[]> {
    const data = await apiFetch<{ standings: StandingGroup[] }>(
      `/competitions/${leagueRef.code}/standings`,
      3600
    );
    return data.standings ?? [];
  },

  async getH2H(matchId: number, _leagueRef: LeagueRef, limit = 10) {
    const data = await apiFetch<{ aggregates: H2HAggregates; matches: Match[] }>(
      `/matches/${matchId}/head2head?limit=${limit}`,
      21600
    );
    return { aggregates: data.aggregates, matches: data.matches ?? [] };
  },

  async getTeamMatches(teamId: number, _leagueRef: LeagueRef, limit = 10): Promise<Match[]> {
    const data = await apiFetch<{ matches: Match[] }>(
      `/teams/${teamId}/matches?status=FINISHED&limit=${limit}`,
      7200
    );
    return data.matches ?? [];
  },

  async getTeamUpcoming(teamId: number, _leagueRef: LeagueRef, limit = 5): Promise<Match[]> {
    const data = await apiFetch<{ matches: Match[] }>(
      `/teams/${teamId}/matches?status=SCHEDULED,TIMED&limit=${limit}`,
      1800
    );
    return data.matches ?? [];
  },

  async getMatchById(matchId: number): Promise<Match | null> {
    try {
      return await apiFetch<Match>(`/matches/${matchId}`, 600);
    } catch {
      return null;
    }
  },
};
