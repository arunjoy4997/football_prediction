import { NextRequest, NextResponse } from "next/server";
import { getStandings } from "@/lib/api";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("league");

  if (!code) {
    return NextResponse.json({ error: "league parameter required" }, { status: 400 });
  }

  if (!SUPPORTED_LEAGUES.find((l) => l.code === code)) {
    return NextResponse.json({ error: "Unsupported league" }, { status: 400 });
  }

  try {
    const standings = await getStandings(code);
    return NextResponse.json({ standings });
  } catch (error) {
    console.error("Standings API error:", error);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
