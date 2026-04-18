import {
  Match,
  StandingEntry,
  H2HAggregates,
  Prediction,
  PredictionFactor,
} from "@/lib/types/football";
import {
  analyzeMotivation,
  analyzeRotationRisk,
  analyzeKnockoutDynamics,
  analyzeStreak,
  isDerby,
  RotationRisk,
} from "./context";

// ─── Weights for each factor ─────────────────────────────────────

const WEIGHTS = {
  form: 0.18,
  homeAway: 0.14,
  h2h: 0.10,
  standings: 0.18,
  goalStats: 0.12,
  motivation: 0.10,
  rotation: 0.06,
  streak: 0.06,
  knockout: 0.04,
  derby: 0.02,
};

// ─── Input types ─────────────────────────────────────────────────

export interface PredictionInput {
  match: Match;
  standings: StandingEntry[];
  h2hAggregates: H2HAggregates | null;
  h2hMatches: Match[];
  homeRecentMatches: Match[];
  awayRecentMatches: Match[];
  homeUpcomingMatches?: Match[];
  awayUpcomingMatches?: Match[];
}

// ─── Main prediction function ────────────────────────────────────

export function generatePrediction(input: PredictionInput): Prediction {
  const {
    match,
    standings,
    h2hAggregates,
    h2hMatches,
    homeRecentMatches,
    awayRecentMatches,
    homeUpcomingMatches = [],
    awayUpcomingMatches = [],
  } = input;

  const factors: PredictionFactor[] = [];
  let homeScore = 0;
  let drawScore = 0;
  let awayScore = 0;

  // ── 1. Current Form ────────────────────────────────────────────
  const homeForm = analyzeRecentForm(homeRecentMatches, match.homeTeam.id);
  const awayForm = analyzeRecentForm(awayRecentMatches, match.awayTeam.id);

  homeScore += homeForm.winRate * WEIGHTS.form;
  awayScore += awayForm.winRate * WEIGHTS.form;
  drawScore += ((homeForm.drawRate + awayForm.drawRate) / 2) * WEIGHTS.form;

  factors.push({
    name: "Current Form",
    description: `${match.homeTeam.shortName}: ${homeForm.summary} | ${match.awayTeam.shortName}: ${awayForm.summary}`,
    impact: homeForm.winRate > awayForm.winRate ? "home" : homeForm.winRate < awayForm.winRate ? "away" : "neutral",
    weight: Math.abs(homeForm.winRate - awayForm.winRate),
  });

  // ── 2. Home/Away Performance ───────────────────────────────────
  const homeRecord = analyzeVenueRecord(homeRecentMatches, match.homeTeam.id, "home");
  const awayRecord = analyzeVenueRecord(awayRecentMatches, match.awayTeam.id, "away");
  const homeAdvantage = 0.08;

  homeScore += (homeRecord.strength + homeAdvantage) * WEIGHTS.homeAway;
  awayScore += awayRecord.strength * WEIGHTS.homeAway;
  drawScore += ((homeRecord.drawRate + awayRecord.drawRate) / 2) * WEIGHTS.homeAway;

  factors.push({
    name: "Home/Away Record",
    description: `${match.homeTeam.shortName} at home: ${homeRecord.wins}W ${homeRecord.draws}D ${homeRecord.losses}L | ${match.awayTeam.shortName} away: ${awayRecord.wins}W ${awayRecord.draws}D ${awayRecord.losses}L`,
    impact: homeRecord.strength > awayRecord.strength ? "home" : homeRecord.strength < awayRecord.strength ? "away" : "neutral",
    weight: Math.abs(homeRecord.strength - awayRecord.strength),
  });

  // ── 3. Head to Head ────────────────────────────────────────────
  if (h2hMatches.length > 0) {
    const h2h = analyzeH2H(h2hMatches, match.homeTeam.id, match.awayTeam.id);
    homeScore += h2h.homeRate * WEIGHTS.h2h;
    awayScore += h2h.awayRate * WEIGHTS.h2h;
    drawScore += h2h.drawRate * WEIGHTS.h2h;

    factors.push({
      name: "Head to Head",
      description: `Last ${h2h.total} meetings: ${h2h.homeWins}W ${h2h.draws}D ${h2h.awayWins}L for ${match.homeTeam.shortName}`,
      impact: h2h.homeWins > h2h.awayWins ? "home" : h2h.awayWins > h2h.homeWins ? "away" : "draw",
      weight: Math.min(Math.abs(h2h.homeRate - h2h.awayRate), 1),
    });
  } else {
    const even = 0.33;
    homeScore += even * WEIGHTS.h2h;
    drawScore += even * WEIGHTS.h2h;
    awayScore += even * WEIGHTS.h2h;
  }

  // ── 4. League Position ─────────────────────────────────────────
  const homeStanding = standings.find((s) => s.team.id === match.homeTeam.id);
  const awayStanding = standings.find((s) => s.team.id === match.awayTeam.id);

  if (homeStanding && awayStanding) {
    const totalTeams = standings.length || 20;
    const homeStrength = Math.pow(1 - (homeStanding.position - 1) / totalTeams, 1.3);
    const awayStrength = Math.pow(1 - (awayStanding.position - 1) / totalTeams, 1.3);
    const norm = homeStrength + awayStrength || 1;

    homeScore += (homeStrength / norm) * WEIGHTS.standings;
    awayScore += (awayStrength / norm) * WEIGHTS.standings;

    const posDiff = Math.abs(homeStanding.position - awayStanding.position);
    const ptsDiff = Math.abs(homeStanding.points - awayStanding.points);
    if (posDiff <= 3 && ptsDiff <= 6) drawScore += 0.15 * WEIGHTS.standings;

    factors.push({
      name: "League Position",
      description: `${match.homeTeam.shortName}: ${homeStanding.position}${ordinal(homeStanding.position)} (${homeStanding.points}pts) vs ${match.awayTeam.shortName}: ${awayStanding.position}${ordinal(awayStanding.position)} (${awayStanding.points}pts) — ${ptsDiff}pt gap`,
      impact: homeStanding.position < awayStanding.position ? "home" : homeStanding.position > awayStanding.position ? "away" : "neutral",
      weight: Math.min(posDiff / totalTeams * 2, 1),
    });
  } else {
    homeScore += 0.33 * WEIGHTS.standings;
    drawScore += 0.33 * WEIGHTS.standings;
    awayScore += 0.33 * WEIGHTS.standings;
  }

  // ── 5. Goal Statistics ─────────────────────────────────────────
  if (homeStanding && awayStanding) {
    const hGPG = homeStanding.playedGames > 0 ? homeStanding.goalsFor / homeStanding.playedGames : 1;
    const hCPG = homeStanding.playedGames > 0 ? homeStanding.goalsAgainst / homeStanding.playedGames : 1;
    const aGPG = awayStanding.playedGames > 0 ? awayStanding.goalsFor / awayStanding.playedGames : 1;
    const aCPG = awayStanding.playedGames > 0 ? awayStanding.goalsAgainst / awayStanding.playedGames : 1;

    const homeXG = (hGPG + aCPG) / 2;
    const awayXG = (aGPG + hCPG) / 2;
    const totalXG = homeXG + awayXG || 1;

    homeScore += (homeXG / totalXG) * WEIGHTS.goalStats;
    awayScore += (awayXG / totalXG) * WEIGHTS.goalStats;
    if (homeXG < 1.2 && awayXG < 1.2) drawScore += 0.12 * WEIGHTS.goalStats;

    factors.push({
      name: "Goal Statistics",
      description: `${match.homeTeam.shortName}: ${hGPG.toFixed(1)} scored / ${hCPG.toFixed(1)} conceded per game | ${match.awayTeam.shortName}: ${aGPG.toFixed(1)} scored / ${aCPG.toFixed(1)} conceded per game`,
      impact: homeXG > awayXG ? "home" : homeXG < awayXG ? "away" : "neutral",
      weight: Math.min(Math.abs(homeXG - awayXG), 1),
    });
  } else {
    homeScore += 0.33 * WEIGHTS.goalStats;
    drawScore += 0.33 * WEIGHTS.goalStats;
    awayScore += 0.33 * WEIGHTS.goalStats;
  }

  // ── 6. Motivation ──────────────────────────────────────────────
  const homeMot = analyzeMotivation(match.homeTeam.id, standings, match.matchday);
  const awayMot = analyzeMotivation(match.awayTeam.id, standings, match.matchday);

  homeScore += homeMot.level * WEIGHTS.motivation * 0.5;
  awayScore += awayMot.level * WEIGHTS.motivation * 0.5;

  // Low motivation = more draw-prone
  if (homeMot.tag === "nothing_to_play" || awayMot.tag === "nothing_to_play") {
    drawScore += 0.1 * WEIGHTS.motivation;
  }
  // Both highly motivated = tight match
  if (homeMot.level >= 0.8 && awayMot.level >= 0.8) {
    drawScore += 0.08 * WEIGHTS.motivation;
  }

  factors.push({
    name: "Motivation",
    description: `${match.homeTeam.shortName}: ${homeMot.reason} | ${match.awayTeam.shortName}: ${awayMot.reason}`,
    impact: homeMot.level > awayMot.level + 0.15 ? "home" : awayMot.level > homeMot.level + 0.15 ? "away" : "neutral",
    weight: Math.abs(homeMot.level - awayMot.level),
  });

  // ── 7. Rotation Risk ──────────────────────────────────────────
  const homeRotation = analyzeRotationRisk(match, homeUpcomingMatches);
  const awayRotation = analyzeRotationRisk(match, awayUpcomingMatches);

  if (homeRotation.level > 0.3 || awayRotation.level > 0.3) {
    // Team rotating = weaker squad
    if (homeRotation.level > awayRotation.level) {
      awayScore += (homeRotation.level - awayRotation.level) * WEIGHTS.rotation;
      drawScore += 0.05 * WEIGHTS.rotation;
    } else {
      homeScore += (awayRotation.level - homeRotation.level) * WEIGHTS.rotation;
      drawScore += 0.05 * WEIGHTS.rotation;
    }

    factors.push({
      name: "Squad Rotation",
      description: `${match.homeTeam.shortName}: ${homeRotation.reason} | ${match.awayTeam.shortName}: ${awayRotation.reason}`,
      impact: homeRotation.level > awayRotation.level ? "away" : homeRotation.level < awayRotation.level ? "home" : "neutral",
      weight: Math.max(homeRotation.level, awayRotation.level),
    });
  }

  // ── 8. Streak Momentum ─────────────────────────────────────────
  const homeStreak = analyzeStreak(homeRecentMatches, match.homeTeam.id);
  const awayStreak = analyzeStreak(awayRecentMatches, match.awayTeam.id);

  if (homeStreak.type !== "none" || awayStreak.type !== "none") {
    const homeStreakBonus = streakBonus(homeStreak);
    const awayStreakBonus = streakBonus(awayStreak);

    homeScore += homeStreakBonus * WEIGHTS.streak;
    awayScore += awayStreakBonus * WEIGHTS.streak;

    const parts: string[] = [];
    if (homeStreak.description) parts.push(`${match.homeTeam.shortName}: ${homeStreak.description}`);
    if (awayStreak.description) parts.push(`${match.awayTeam.shortName}: ${awayStreak.description}`);

    if (parts.length > 0) {
      factors.push({
        name: "Momentum",
        description: parts.join(" | "),
        impact: homeStreakBonus > awayStreakBonus ? "home" : awayStreakBonus > homeStreakBonus ? "away" : "neutral",
        weight: Math.abs(homeStreakBonus - awayStreakBonus),
      });
    }
  }

  // ── 9. 2nd Leg / Knockout Dynamics ─────────────────────────────
  const knockout = analyzeKnockoutDynamics(match, [...homeRecentMatches, ...awayRecentMatches]);

  if (knockout?.is2ndLeg && knockout.leadingTeamId) {
    // Team with lead tends to defend (draw more likely)
    // Team behind tends to push (creating open game)
    drawScore += 0.08 * WEIGHTS.knockout;

    const leadIsHome = knockout.leadingTeamId === match.homeTeam.id;
    // Team behind gets slight boost (desperation = attack)
    if (leadIsHome) awayScore += 0.06 * WEIGHTS.knockout;
    else homeScore += 0.06 * WEIGHTS.knockout;

    factors.push({
      name: "2nd Leg Dynamics",
      description: knockout.description,
      impact: leadIsHome ? "away" : "home",
      weight: 0.7,
    });
  } else if (knockout && !knockout.is2ndLeg) {
    factors.push({
      name: "Knockout Match",
      description: knockout.description + " — typically tighter game",
      impact: "draw",
      weight: 0.3,
    });
    drawScore += 0.04 * WEIGHTS.knockout;
  }

  // ── 10. Derby Factor ───────────────────────────────────────────
  const derbyCheck = isDerby(match.homeTeam.id, match.awayTeam.id);
  if (derbyCheck.isDerby) {
    // Derbies are historically tighter — boost draw, reduce gap
    drawScore += 0.15 * WEIGHTS.derby;
    const gap = Math.abs(homeScore - awayScore);
    if (gap > 0.02) {
      // Pull scores closer together
      const avg = (homeScore + awayScore) / 2;
      homeScore = homeScore * 0.85 + avg * 0.15;
      awayScore = awayScore * 0.85 + avg * 0.15;
    }

    factors.push({
      name: "Derby Match",
      description: `${derbyCheck.name} — historically unpredictable, tighter margins`,
      impact: "draw",
      weight: 0.6,
    });
  }

  // ── Normalize to percentages ───────────────────────────────────
  drawScore += 0.08; // baseline draw component

  const total = homeScore + drawScore + awayScore;
  let homeWin = total > 0 ? Math.round((homeScore / total) * 100) : 33;
  let drawPct = total > 0 ? Math.round((drawScore / total) * 100) : 34;
  let awayWin = 100 - homeWin - drawPct;

  homeWin = clamp(homeWin, 5, 80);
  drawPct = clamp(drawPct, 10, 40);
  awayWin = clamp(awayWin, 5, 80);
  const ct = homeWin + drawPct + awayWin;
  homeWin = Math.round((homeWin / ct) * 100);
  drawPct = Math.round((drawPct / ct) * 100);
  awayWin = 100 - homeWin - drawPct;

  // ── Confidence ─────────────────────────────────────────────────
  const maxProb = Math.max(homeWin, drawPct, awayWin);
  const spread = maxProb - Math.min(homeWin, drawPct, awayWin);
  const dataScore = calculateDataCompleteness(input);
  const confidence = Math.round(clamp(
    spread * 0.5 + dataScore * 35 + (maxProb > 50 ? 10 : 0),
    25, 92
  ));

  let verdict: string;
  if (homeWin > awayWin && homeWin > drawPct) verdict = "Home Win";
  else if (awayWin > homeWin && awayWin > drawPct) verdict = "Away Win";
  else verdict = "Draw";

  const sorted = [homeWin, drawPct, awayWin].sort((a, b) => b - a);
  const isBettingPick = confidence >= 60 && sorted[0] - sorted[1] >= 12;

  return {
    match,
    homeWin,
    draw: drawPct,
    awayWin,
    confidence,
    verdict,
    isBettingPick,
    factors,
    homePosition: homeStanding?.position ?? null,
    awayPosition: awayStanding?.position ?? null,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function streakBonus(s: ReturnType<typeof analyzeStreak>): number {
  switch (s.type) {
    case "winning": return 0.3 + Math.min(s.length, 6) * 0.05;
    case "unbeaten": return 0.2 + Math.min(s.length, 8) * 0.03;
    case "losing": return -(0.2 + Math.min(s.length, 5) * 0.05);
    case "winless": return -(0.15 + Math.min(s.length, 6) * 0.03);
    default: return 0;
  }
}

function analyzeRecentForm(
  matches: Match[],
  teamId: number
): { winRate: number; drawRate: number; summary: string } {
  if (matches.length === 0) return { winRate: 0.33, drawRate: 0.33, summary: "No data" };

  const last = matches.slice(-10);
  let wins = 0, draws = 0, losses = 0;
  let totalWeight = 0, wScore = 0, dScore = 0;

  last.forEach((m, i) => {
    const w = (i + 1) * (i + 1);
    totalWeight += w;
    const isHome = m.homeTeam.id === teamId;
    const winner = m.score.winner;
    if ((isHome && winner === "HOME_TEAM") || (!isHome && winner === "AWAY_TEAM")) { wins++; wScore += w; }
    else if (winner === "DRAW") { draws++; dScore += w; }
    else if (winner) { losses++; }
  });

  const formStr = last.slice(-5).map((m) => {
    const isHome = m.homeTeam.id === teamId;
    if ((isHome && m.score.winner === "HOME_TEAM") || (!isHome && m.score.winner === "AWAY_TEAM")) return "W";
    if (m.score.winner === "DRAW") return "D";
    return "L";
  }).join("");

  return {
    winRate: totalWeight > 0 ? wScore / totalWeight : 0.33,
    drawRate: totalWeight > 0 ? dScore / totalWeight : 0.33,
    summary: `${formStr} (${wins}W ${draws}D ${losses}L last ${last.length})`,
  };
}

function analyzeVenueRecord(
  matches: Match[], teamId: number, venue: "home" | "away"
): { wins: number; draws: number; losses: number; strength: number; drawRate: number } {
  const venueMatches = matches.filter((m) =>
    venue === "home" ? m.homeTeam.id === teamId : m.awayTeam.id === teamId
  );
  let wins = 0, draws = 0, losses = 0;
  for (const m of venueMatches) {
    const isHome = m.homeTeam.id === teamId;
    if ((isHome && m.score.winner === "HOME_TEAM") || (!isHome && m.score.winner === "AWAY_TEAM")) wins++;
    else if (m.score.winner === "DRAW") draws++;
    else if (m.score.winner) losses++;
  }
  const total = wins + draws + losses;
  return { wins, draws, losses, strength: total > 0 ? wins / total : 0.33, drawRate: total > 0 ? draws / total : 0.33 };
}

function analyzeH2H(matches: Match[], homeTeamId: number, awayTeamId: number) {
  let homeWins = 0, draws = 0, awayWins = 0;
  for (const m of matches) {
    if (!m.score.winner) continue;
    const isHomeInMatch = m.homeTeam.id === homeTeamId;
    if (m.score.winner === "HOME_TEAM") { isHomeInMatch ? homeWins++ : awayWins++; }
    else if (m.score.winner === "AWAY_TEAM") { isHomeInMatch ? awayWins++ : homeWins++; }
    else { draws++; }
  }
  const total = homeWins + draws + awayWins;
  return {
    homeWins, draws, awayWins, total,
    homeRate: total > 0 ? homeWins / total : 0.33,
    drawRate: total > 0 ? draws / total : 0.33,
    awayRate: total > 0 ? awayWins / total : 0.33,
  };
}

function calculateDataCompleteness(input: PredictionInput): number {
  let score = 0;
  if (input.standings.length > 0) score += 0.25;
  if (input.h2hAggregates) score += 0.2;
  if (input.homeRecentMatches.length >= 5) score += 0.2;
  else if (input.homeRecentMatches.length > 0) score += 0.1;
  if (input.awayRecentMatches.length >= 5) score += 0.2;
  else if (input.awayRecentMatches.length > 0) score += 0.1;
  if (input.homeUpcomingMatches && input.homeUpcomingMatches.length > 0) score += 0.075;
  if (input.awayUpcomingMatches && input.awayUpcomingMatches.length > 0) score += 0.075;
  return score;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
