import { NextRequest, NextResponse } from "next/server";
import {
  getUpcomingMatches,
  getStandings,
  getTeamMatches,
  getTeamUpcoming,
} from "@/lib/api/football-api";
import { generatePrediction } from "@/lib/prediction/engine";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";
import { Prediction, Match, StandingEntry } from "@/lib/types/football";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("league");

  if (!code) {
    return NextResponse.json({ error: "league parameter required" }, { status: 400 });
  }

  if (!SUPPORTED_LEAGUES.find((l) => l.code === code)) {
    return NextResponse.json({ error: "Unsupported league" }, { status: 400 });
  }

  try {
    // Phase 1: Fetch upcoming matches + standings (2 API calls)
    const [matches, standingsData] = await Promise.all([
      getUpcomingMatches(code, 10),
      getStandings(code),
    ]);

    if (matches.length === 0) {
      return NextResponse.json({ predictions: [] });
    }

    const table =
      standingsData.find((s) => s.type === "TOTAL")?.table ??
      standingsData[0]?.table ??
      [];

    // Collect unique team IDs
    const teamIds = new Set<number>();
    for (const m of matches) {
      teamIds.add(m.homeTeam.id);
      teamIds.add(m.awayTeam.id);
    }

    // Phase 2: Fetch recent results + upcoming fixtures per team
    // Each team needs 2 calls: finished matches + scheduled matches
    // Batch to stay within 10 req/min
    const teamRecentMap = new Map<number, Match[]>();
    const teamUpcomingMap = new Map<number, Match[]>();
    const teamIdArray = Array.from(teamIds);
    const batchSize = 4; // 4 teams x 2 calls = 8 parallel requests

    for (let i = 0; i < teamIdArray.length; i += batchSize) {
      const batch = teamIdArray.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.flatMap((id) => [
          getTeamMatches(id, "FINISHED", 10).catch(() => []),
          getTeamUpcoming(id, 5).catch(() => []),
        ])
      );

      batch.forEach((id, idx) => {
        teamRecentMap.set(id, results[idx * 2] as Match[]);
        teamUpcomingMap.set(id, results[idx * 2 + 1] as Match[]);
      });

      if (i + batchSize < teamIdArray.length) {
        await new Promise((r) => setTimeout(r, 7000));
      }
    }

    // Phase 3: Generate predictions (pure computation, no API calls)
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

    // Sort within matchdays: betting picks first, then by confidence
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
    return NextResponse.json({ error: "Failed to generate predictions" }, { status: 500 });
  }
}
