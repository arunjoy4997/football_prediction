import { NextRequest, NextResponse } from "next/server";
import { getUpcomingMatches } from "@/lib/api/football-api";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("league");

  try {
    if (code) {
      if (!SUPPORTED_LEAGUES.find((l) => l.code === code)) {
        return NextResponse.json({ error: "Unsupported league" }, { status: 400 });
      }
      const matches = await getUpcomingMatches(code, 15);
      return NextResponse.json({ matches });
    }

    // All leagues
    const all = await Promise.all(
      SUPPORTED_LEAGUES.map((l) => getUpcomingMatches(l.code, 5))
    );
    return NextResponse.json({ matches: all.flat() });
  } catch (error) {
    console.error("Fixtures API error:", error);
    return NextResponse.json({ error: "Failed to fetch fixtures" }, { status: 500 });
  }
}
