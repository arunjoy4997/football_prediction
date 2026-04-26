import { cache } from "./cache";
import { Match, StandingGroup, H2HAggregates } from "@/lib/types/football";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const BASE_URL = "https://api.football-data.org/v4";

// ─── Rate-Limited Request Queue ──────────────────────────────────
// football-data.org allows 10 req/min for free tier.
// We track a sliding window and queue requests to stay safely under it.

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests = 9; // headroom under 10/min limit
  private readonly windowMs = 60_000;

  async acquire(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      // Wait until the oldest request falls out of the window
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 100;
      await new Promise((r) => setTimeout(r, waitMs));
      return this.acquire();
    }

    this.timestamps.push(Date.now());
  }
}

const limiter = new RateLimiter();

// ─── Core fetch with retry ───────────────────────────────────────

async function apiFetch<T>(path: string, cacheTTL = 900): Promise<T> {
  const cacheKey = path;

  // Fresh cache hit — return immediately
  const fresh = cache.get<T>(cacheKey);
  if (fresh !== null) return fresh;

  // Try with retries (3 attempts, exponential backoff)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await limiter.acquire();

      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "X-Auth-Token": API_KEY },
        cache: "no-store",
      });

      if (res.status === 429) {
        // Rate limited — wait and retry
        const retryAfter = parseInt(res.headers.get("retry-after") || "10");
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        continue;
      }

      if (!res.ok) {
        // 5xx — retry; 4xx — don't retry
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

  // All retries failed — try stale cache as last resort
  const stale = cache.getStale<T>(cacheKey);
  if (stale.data !== null) {
    console.warn(`[API] Using stale cache for ${path}`);
    return stale.data;
  }

  throw lastError || new Error(`Failed after retries: ${path}`);
}

// ─── Upcoming Matches ────────────────────────────────────────────

export async function getUpcomingMatches(
  competitionCode: string,
  daysAhead = 7
): Promise<Match[]> {
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const data = await apiFetch<{ matches: Match[] }>(
    `/competitions/${competitionCode}/matches?status=SCHEDULED,TIMED&dateFrom=${from}&dateTo=${to}`,
    900 // 15 min — fixtures rarely change
  );
  return data.matches ?? [];
}

// ─── Standings ───────────────────────────────────────────────────

export async function getStandings(
  competitionCode: string
): Promise<StandingGroup[]> {
  const data = await apiFetch<{ standings: StandingGroup[] }>(
    `/competitions/${competitionCode}/standings`,
    3600 // 1 hour — standings update once per matchday
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
  }>(`/matches/${matchId}/head2head?limit=${limit}`, 21600); // 6 hours
  return { aggregates: data.aggregates, matches: data.matches ?? [] };
}

// ─── Team recent matches ─────────────────────────────────────────

export async function getTeamMatches(
  teamId: number,
  status: "FINISHED" | "SCHEDULED" = "FINISHED",
  limit = 10
): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(
    `/teams/${teamId}/matches?status=${status}&limit=${limit}`,
    7200 // 2 hours — past matches don't change
  );
  return data.matches ?? [];
}

// ─── Team upcoming matches (for rotation detection) ──────────────

export async function getTeamUpcoming(
  teamId: number,
  limit = 5
): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(
    `/teams/${teamId}/matches?status=SCHEDULED,TIMED&limit=${limit}`,
    1800 // 30 min
  );
  return data.matches ?? [];
}

// ─── Single match ────────────────────────────────────────────────

export async function getMatchById(matchId: number): Promise<Match | null> {
  try {
    const data = await apiFetch<Match>(`/matches/${matchId}`, 600);
    return data;
  } catch {
    return null;
  }
}

// ─── Live matches ────────────────────────────────────────────────

export async function getLiveMatches(): Promise<Match[]> {
  const data = await apiFetch<{ matches: Match[] }>(
    `/matches?status=IN_PLAY,PAUSED`,
    60
  );
  return data.matches ?? [];
}
