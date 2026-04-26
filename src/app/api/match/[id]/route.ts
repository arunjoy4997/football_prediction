import { NextRequest, NextResponse } from "next/server";
import {
  getMatchById,
  getStandings,
  getH2H,
  getTeamMatches,
  getTeamUpcoming,
} from "@/lib/api";
import { generatePrediction } from "@/lib/prediction/engine";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id);
  const code = request.nextUrl.searchParams.get("league");

  if (!code) {
    return NextResponse.json({ error: "league query param required" }, { status: 400 });
  }

  if (!SUPPORTED_LEAGUES.find((l) => l.code === code)) {
    return NextResponse.json({ error: "Unsupported league" }, { status: 400 });
  }

  try {
    const match = await getMatchById(matchId, code);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const [standingsData, h2hData, homeRecent, awayRecent, homeUpcoming, awayUpcoming] =
      await Promise.all([
        getStandings(code).catch(() => []),
        getH2H(matchId, code, 10).catch(() => ({ aggregates: null, matches: [] })),
        getTeamMatches(match.homeTeam.id, code, 10).catch(() => []),
        getTeamMatches(match.awayTeam.id, code, 10).catch(() => []),
        getTeamUpcoming(match.homeTeam.id, code, 5).catch(() => []),
        getTeamUpcoming(match.awayTeam.id, code, 5).catch(() => []),
      ]);

    const table =
      standingsData.find((s) => s.type === "TOTAL")?.table ??
      standingsData[0]?.table ??
      [];

    const prediction = generatePrediction({
      match,
      standings: table,
      h2hAggregates: h2hData.aggregates,
      h2hMatches: h2hData.matches,
      homeRecentMatches: homeRecent,
      awayRecentMatches: awayRecent,
      homeUpcomingMatches: homeUpcoming,
      awayUpcomingMatches: awayUpcoming,
    });

    return NextResponse.json({
      prediction,
      h2hMatches: h2hData.matches,
      h2hAggregates: h2hData.aggregates,
      standings: table.filter(
        (s) => s.team.id === match.homeTeam.id || s.team.id === match.awayTeam.id
      ),
    });
  } catch (error) {
    console.error("Match detail API error:", error);
    return NextResponse.json({ error: "Failed to fetch match details" }, { status: 500 });
  }
}
