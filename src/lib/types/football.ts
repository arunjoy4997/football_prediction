// ─── League Config ───────────────────────────────────────────────

export interface LeagueConfig {
  id: number;
  code: string;
  name: string;
  shortName: string;
  country: string;
  logo: string;
  provider: "football-data" | "api-football";
  apiFootballId?: number; // for api-football provider only
  season?: number;        // for api-football provider only
}

// ─── Team ────────────────────────────────────────────────────────

export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

// ─── Match (Fixture) ─────────────────────────────────────────────

export interface Match {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";
  matchday: number | null;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: Team;
  awayTeam: Team;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
  area: {
    id: number;
    name: string;
    code: string;
    flag: string | null;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  referees: { id: number; name: string; type: string; nationality: string }[];
}

// ─── Standings ───────────────────────────────────────────────────

export interface StandingEntry {
  position: number;
  team: Team;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface StandingGroup {
  stage: string;
  type: string;
  group: string | null;
  table: StandingEntry[];
}

// ─── H2H ─────────────────────────────────────────────────────────

export interface H2HAggregates {
  numberOfMatches: number;
  totalGoals: number;
  homeTeam: { id: number; name: string; wins: number; draws: number; losses: number };
  awayTeam: { id: number; name: string; wins: number; draws: number; losses: number };
}

// ─── Prediction Result ───────────────────────────────────────────

export interface Prediction {
  match: Match;
  homeWin: number;   // 0-100
  draw: number;      // 0-100
  awayWin: number;   // 0-100
  confidence: number; // 0-100
  verdict: string;
  isBettingPick: boolean;
  factors: PredictionFactor[];
  homePosition: number | null;
  awayPosition: number | null;
}

export interface PredictionFactor {
  name: string;
  description: string;
  impact: "home" | "away" | "draw" | "neutral";
  weight: number;
}
