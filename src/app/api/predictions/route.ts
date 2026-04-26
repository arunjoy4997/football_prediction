import { NextRequest, NextResponse } from "next/server";
import {
  getUpcomingMatches,
  getStandings,
  getTeamMatches,
  getTeamUpcoming,
} from "@/lib/api/football-api";
import { generatePrediction } from "@/lib/prediction/engine";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";
import { Prediction, Match } from "@/lib/types/football";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("league");

  if (!code) {
    return NextResponse.json({ error: "league parameter required" }, { status: 400 });
  }

  if (!SUPPORTED_LEAGUES.find((l) => l.code === code)) {
    return NextResponse.json({ error: "Unsupported league" }, { status: 400 });
  }

  try {
    // Phase 1: matches + standings (in parallel — rate limiter handles pacing)
    const [matches, standingsData] = await Promise.all([
      getUpcomingMatches(code, 7),
      getStandings(code),
    ]);

    if (matches.length === 0) {
      return NextResponse.json({ predictions: [] });
    }

    const table =
      standingsData.find((s) => s.type === "TOTAL")?.table ??
      standingsData[0]?.table ??
      [];

    // Phase 2: fetch team data — rate limiter queues these automatically
    // We fire them all in parallel; the limiter will pace them at 9/min
    const teamIds = new Set<number>();
    for (const m of matches) {
      teamIds.add(m.homeTeam.id);
      teamIds.add(m.awayTeam.id);
    }
    const teamIdArray = Array.from(teamIds);

    // Settle all promises — partial failures don't kill the whole prediction
    const teamDataPromises = teamIdArray.flatMap((id) => [
      getTeamMatches(id, "FINISHED", 10).catch((e) => {
        console.warn(`Team ${id} recent failed:`, e.message);
        return [];
      }),
      getTeamUpcoming(id, 5).catch((e) => {
        console.warn(`Team ${id} upcoming failed:`, e.message);
        return [];
      }),
    ]);

    const results = await Promise.all(teamDataPromises);

    const teamRecentMap = new Map<number, Match[]>();
    const teamUpcomingMap = new Map<number, Match[]>();
    teamIdArray.forEach((id, i) => {
      teamRecentMap.set(id, results[i * 2] as Match[]);
      teamUpcomingMap.set(id, results[i * 2 + 1] as Match[]);
    });

    // Phase 3: generate predictions
    const predictions: Prediction[] = matches.map((match) =>
      generatePrediction({
        match,
        standings: table,
        h2hAggregates: null,
        h2hMatches: [],
        homeRecentMatches: teamRecentMap.get(match.homeTeam.id) || [],
        awayRecentMatches: teamRecentMap.get(match.awayTeam.id) || [],
        homeUpcomingMatches: teamUpcomingMap.get(match.homeTeam.id) || [],
        awayUpcomingMatches: teamUpcomingMap.get(match.awayTeam.id) || [],
      })
    );

    predictions.sort((a, b) => {
      const mdA = a.match.matchday ?? 99;
      const mdB = b.match.matchday ?? 99;
      if (mdA !== mdB) return mdA - mdB;
      if (a.isBettingPick !== b.isBettingPick) return a.isBettingPick ? -1 : 1;
      return b.confidence - a.confidence;
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Predictions API error:", error);
    return NextResponse.json(
      { error: "Failed to generate predictions" },
      { status: 500 }
    );
  }
}
