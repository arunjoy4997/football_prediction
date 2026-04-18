import { Match, StandingEntry } from "@/lib/types/football";

// ─── Motivation Analysis ─────────────────────────────────────────
// Checks: title race, relegation battle, European spots, nothing to play for

export interface MotivationResult {
  level: number;     // 0 (dead rubber) to 1 (must-win)
  reason: string;
  tag: "title_race" | "european_push" | "relegation_battle" | "mid_table" | "nothing_to_play" | "unknown";
}

export function analyzeMotivation(
  teamId: number,
  standings: StandingEntry[],
  matchday: number | null
): MotivationResult {
  const entry = standings.find((s) => s.team.id === teamId);
  if (!entry || standings.length === 0) {
    return { level: 0.5, reason: "No standings data", tag: "unknown" };
  }

  const totalTeams = standings.length;
  const pos = entry.position;
  const leader = standings[0];
  const gapToFirst = leader.points - entry.points;
  const relegationLine = totalTeams - 3; // bottom 3 relegate
  const gapToRelegation = entry.points - (standings[relegationLine]?.points ?? 0);

  // Estimate remaining matches (rough: ~38 total for most leagues)
  const totalMatchdays = totalTeams <= 18 ? 34 : 38;
  const remaining = Math.max(totalMatchdays - (matchday ?? 30), 1);
  const maxCatchUp = remaining * 3; // max points possible

  // Title race: within realistic catching distance of 1st
  if (pos === 1) {
    const secondGap = entry.points - (standings[1]?.points ?? 0);
    if (secondGap <= 6) return { level: 0.95, reason: `Leading by ${secondGap}pts — tight title race`, tag: "title_race" };
    if (secondGap <= 12) return { level: 0.8, reason: `Leading by ${secondGap}pts — comfortable but not sealed`, tag: "title_race" };
    return { level: 0.65, reason: `Leading by ${secondGap}pts — title nearly secured`, tag: "title_race" };
  }

  if (pos <= 4 && gapToFirst <= maxCatchUp * 0.6) {
    if (gapToFirst <= 3) return { level: 0.95, reason: `${gapToFirst}pts off 1st — genuine title contender`, tag: "title_race" };
    if (gapToFirst <= 8) return { level: 0.85, reason: `${gapToFirst}pts off top — fighting for the title`, tag: "title_race" };
    return { level: 0.75, reason: `${pos}${ordinal(pos)} — pushing for top 4`, tag: "european_push" };
  }

  // European spots (top 4-7 depending on league)
  if (pos <= 7) {
    const gapTo4th = entry.points - (standings[3]?.points ?? 0);
    if (gapTo4th >= 0) return { level: 0.75, reason: `${pos}${ordinal(pos)} — in European spot`, tag: "european_push" };
    if (Math.abs(gapTo4th) <= 6) return { level: 0.7, reason: `${pos}${ordinal(pos)} — chasing European spot, ${Math.abs(gapTo4th)}pts off 4th`, tag: "european_push" };
  }

  // Relegation battle
  if (pos >= relegationLine) {
    return { level: 0.95, reason: `${pos}${ordinal(pos)} — in relegation zone!`, tag: "relegation_battle" };
  }
  if (gapToRelegation <= 6) {
    return { level: 0.8, reason: `${pos}${ordinal(pos)} — only ${gapToRelegation}pts above relegation`, tag: "relegation_battle" };
  }

  // Nothing to play for — mathematically can't catch European spots AND safe from relegation
  if (gapToRelegation > 15 && pos > 10) {
    const gapTo7th = (standings[6]?.points ?? 0) - entry.points;
    if (gapTo7th > maxCatchUp) {
      return { level: 0.3, reason: `${pos}${ordinal(pos)} — safe, no European push possible`, tag: "nothing_to_play" };
    }
  }

  // Mid-table
  return { level: 0.5, reason: `${pos}${ordinal(pos)} — mid-table`, tag: "mid_table" };
}

// ─── Rotation Risk ───────────────────────────────────────────────
// If team has a big match soon (UCL, different competition), rotation likely

export interface RotationRisk {
  level: number;    // 0 (no rotation) to 1 (heavy rotation)
  reason: string;
}

const HIGH_PRIORITY_COMPETITIONS = ["CL", "EL", "CLI"]; // Champions League, Europa League, Conference League

export function analyzeRotationRisk(
  currentMatch: Match,
  upcomingMatches: Match[]
): RotationRisk {
  if (upcomingMatches.length === 0) {
    return { level: 0, reason: "No upcoming fixtures detected" };
  }

  const currentDate = new Date(currentMatch.utcDate).getTime();
  const currentComp = currentMatch.competition.code;

  // Find next match after this one
  const nextMatches = upcomingMatches
    .filter((m) => m.id !== currentMatch.id && new Date(m.utcDate).getTime() > currentDate)
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  if (nextMatches.length === 0) return { level: 0, reason: "No fixtures after this match" };

  const nextMatch = nextMatches[0];
  const daysBetween = (new Date(nextMatch.utcDate).getTime() - currentDate) / 86400000;
  const nextComp = nextMatch.competition.code;
  const nextIsHighPriority = HIGH_PRIORITY_COMPETITIONS.includes(nextComp);
  const currentIsHighPriority = HIGH_PRIORITY_COMPETITIONS.includes(currentComp);
  const isKnockout = nextMatch.stage?.includes("FINAL") || nextMatch.stage?.includes("SEMI") || nextMatch.stage?.includes("QUARTER");

  // Different competition coming up AND it's high priority
  if (nextIsHighPriority && !currentIsHighPriority && daysBetween <= 4) {
    if (isKnockout) {
      return { level: 0.9, reason: `${nextComp} knockout in ${daysBetween.toFixed(0)} days — heavy rotation expected` };
    }
    return { level: 0.7, reason: `${nextComp} match in ${daysBetween.toFixed(0)} days — rotation likely` };
  }

  // Same competition but very congested
  if (daysBetween <= 3) {
    return { level: 0.5, reason: `Only ${daysBetween.toFixed(0)} days until next match — fatigue/rotation possible` };
  }

  // Knockout match coming within a week
  if (isKnockout && daysBetween <= 7) {
    return { level: 0.4, reason: `${nextComp} knockout within a week — some rotation possible` };
  }

  return { level: 0, reason: "Adequate rest between fixtures" };
}

// ─── 2nd Leg / Knockout Dynamics ─────────────────────────────────

export interface KnockoutContext {
  is2ndLeg: boolean;
  firstLegResult: string | null;  // "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
  firstLegScore: { home: number; away: number } | null;
  leadingTeamId: number | null;
  description: string;
}

export function analyzeKnockoutDynamics(
  match: Match,
  recentMatches: Match[]
): KnockoutContext | null {
  // Only applies to knockout stages
  const stage = match.stage?.toUpperCase() ?? "";
  const isKnockout = stage.includes("FINAL") || stage.includes("SEMI") ||
    stage.includes("QUARTER") || stage.includes("ROUND_OF") ||
    stage.includes("LAST_") || stage.includes("PLAYOFF");

  if (!isKnockout) return null;

  // Look for the 1st leg: same competition, same two teams, within last 30 days
  const homeId = match.homeTeam.id;
  const awayId = match.awayTeam.id;
  const matchDate = new Date(match.utcDate).getTime();

  const firstLeg = recentMatches.find((m) => {
    if (m.competition.code !== match.competition.code) return false;
    if (m.status !== "FINISHED") return false;
    const sameTeams =
      (m.homeTeam.id === awayId && m.awayTeam.id === homeId) || // reversed home/away
      (m.homeTeam.id === homeId && m.awayTeam.id === awayId);
    const daysBefore = (matchDate - new Date(m.utcDate).getTime()) / 86400000;
    return sameTeams && daysBefore > 0 && daysBefore < 30;
  });

  if (!firstLeg) {
    if (isKnockout) return { is2ndLeg: false, firstLegResult: null, firstLegScore: null, leadingTeamId: null, description: "Knockout match (1st leg or single leg)" };
    return null;
  }

  // This is a 2nd leg
  const flHome = firstLeg.score.fullTime.home ?? 0;
  const flAway = firstLeg.score.fullTime.away ?? 0;

  // Determine who leads on aggregate going into 2nd leg
  // In 1st leg, firstLeg.homeTeam scored flHome, firstLeg.awayTeam scored flAway
  // Now in 2nd leg, the away team from 1st leg is home, so:
  let leadingTeamId: number | null = null;
  let desc: string;

  if (flHome > flAway) {
    leadingTeamId = firstLeg.homeTeam.id;
    desc = `2nd leg — ${firstLeg.homeTeam.shortName} leads ${flHome}-${flAway} from 1st leg`;
  } else if (flAway > flHome) {
    leadingTeamId = firstLeg.awayTeam.id;
    desc = `2nd leg — ${firstLeg.awayTeam.shortName} leads ${flAway}-${flHome} from 1st leg`;
  } else {
    desc = `2nd leg — level at ${flHome}-${flAway} from 1st leg`;
  }

  return {
    is2ndLeg: true,
    firstLegResult: firstLeg.score.winner,
    firstLegScore: { home: flHome, away: flAway },
    leadingTeamId,
    description: desc,
  };
}

// ─── Streak Analysis ─────────────────────────────────────────────

export interface StreakResult {
  type: "winning" | "losing" | "unbeaten" | "winless" | "none";
  length: number;
  description: string;
}

export function analyzeStreak(matches: Match[], teamId: number): StreakResult {
  if (matches.length === 0) return { type: "none", length: 0, description: "No data" };

  // Latest matches first
  const sorted = [...matches]
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

  if (sorted.length === 0) return { type: "none", length: 0, description: "No results" };

  const results = sorted.map((m) => {
    const isHome = m.homeTeam.id === teamId;
    if ((isHome && m.score.winner === "HOME_TEAM") || (!isHome && m.score.winner === "AWAY_TEAM")) return "W";
    if (m.score.winner === "DRAW") return "D";
    return "L";
  });

  // Count streaks from most recent
  let winStreak = 0, loseStreak = 0, unbeaten = 0, winless = 0;

  for (const r of results) {
    if (r === "W") { winStreak++; unbeaten++; } else break;
  }
  if (winStreak === 0) {
    for (const r of results) {
      if (r === "L") { loseStreak++; winless++; } else break;
    }
  }
  if (winStreak === 0 && loseStreak === 0) {
    for (const r of results) {
      if (r !== "L") unbeaten++; else break;
    }
    for (const r of results) {
      if (r !== "W") winless++; else break;
    }
  }

  if (winStreak >= 3) return { type: "winning", length: winStreak, description: `${winStreak} wins in a row` };
  if (loseStreak >= 3) return { type: "losing", length: loseStreak, description: `${loseStreak} losses in a row` };
  if (unbeaten >= 5) return { type: "unbeaten", length: unbeaten, description: `Unbeaten in ${unbeaten} matches` };
  if (winless >= 5) return { type: "winless", length: winless, description: `Winless in ${winless} matches` };

  return { type: "none", length: 0, description: "" };
}

// ─── Derby Detection ─────────────────────────────────────────────
// Known major derbies — these matches are historically tighter

const DERBIES: [number, number, string][] = [
  // Premier League (football-data.org IDs)
  [57, 73, "North London Derby"],          // Arsenal vs Tottenham
  [64, 62, "Merseyside Derby"],            // Liverpool vs Everton
  [65, 66, "Manchester Derby"],            // Man City vs Man United
  [61, 73, "London Derby"],                // Chelsea vs Tottenham
  [57, 61, "London Derby"],                // Arsenal vs Chelsea
  [64, 66, "Northwest Derby"],             // Liverpool vs Man United
  // La Liga
  [81, 86, "El Clásico"],                  // Barcelona vs Real Madrid
  [78, 86, "Madrid Derby"],                // Atlético vs Real Madrid
  [81, 78, "El Derbi"],                    // Barcelona vs Atlético
  // Serie A
  [98, 108, "Derby della Madonnina"],      // AC Milan vs Inter
  [109, 108, "Derby d'Italia"],            // Juventus vs Inter
  [109, 98, "Derby della Mole (implied)"], // Juventus vs AC Milan
  [100, 110, "Derby della Capitale"],      // Roma vs Lazio
  // Bundesliga
  [5, 4, "Der Klassiker"],                 // Bayern vs Dortmund
  // Ligue 1
  [524, 556, "Le Classique"],              // PSG vs Marseille
];

export function isDerby(homeId: number, awayId: number): { isDerby: boolean; name: string | null } {
  const found = DERBIES.find(
    ([a, b]) => (a === homeId && b === awayId) || (a === awayId && b === homeId)
  );
  return { isDerby: !!found, name: found?.[2] ?? null };
}

// ─── Utils ───────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
