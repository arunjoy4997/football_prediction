import { NextRequest, NextResponse } from "next/server";
import {
  getMatchById,
  getStandings,
  getH2H,
  getTeamMatches,
  getTeamUpcoming,
} from "@/lib/api/football-api";
import { generatePrediction } from "@/lib/prediction/engine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id);

  try {
    const match = await getMatchById(matchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const competitionCode = match.competition.code;

    const [standingsData, h2hData, homeRecent, awayRecent, homeUpcoming, awayUpcoming] = await Promise.all([
      getStandings(competitionCode).catch(() => []),
      getH2H(matchId, 10).catch(() => ({ aggregates: null, matches: [] })),
      getTeamMatches(match.homeTeam.id, "FINISHED", 10).catch(() => []),
      getTeamMatches(match.awayTeam.id, "FINISHED", 10).catch(() => []),
      getTeamUpcoming(match.homeTeam.id, 5).catch(() => []),
      getTeamUpcoming(match.awayTeam.id, 5).catch(() => []),
    ]);

    const table =
      standingsData.find((s) => s.type === "TOTAL")?.table ??
      standingsData[0]?.table ??
      [];

    const prediction = generatePrediction({
      match,
      standings: table,
      h2hAggregates: h2hData.aggregates as any,
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
