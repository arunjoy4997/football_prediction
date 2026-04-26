import { LeagueConfig } from "@/lib/types/football";

// ─── Leagues from football-data.org (free tier — current season, full data) ─

const FOOTBALL_DATA_LEAGUES: LeagueConfig[] = [
  {
    id: 2001, code: "CL", name: "UEFA Champions League", shortName: "UCL",
    country: "Europe", logo: "https://crests.football-data.org/CL.png",
    provider: "football-data",
  },
  {
    id: 2021, code: "PL", name: "Premier League", shortName: "PL",
    country: "England", logo: "https://crests.football-data.org/PL.png",
    provider: "football-data",
  },
  {
    id: 2014, code: "PD", name: "La Liga", shortName: "La Liga",
    country: "Spain", logo: "https://crests.football-data.org/PD.png",
    provider: "football-data",
  },
  {
    id: 2019, code: "SA", name: "Serie A", shortName: "Serie A",
    country: "Italy", logo: "https://crests.football-data.org/SA.png",
    provider: "football-data",
  },
  {
    id: 2002, code: "BL1", name: "Bundesliga", shortName: "Bundesliga",
    country: "Germany", logo: "https://crests.football-data.org/BL1.png",
    provider: "football-data",
  },
  {
    id: 2015, code: "FL1", name: "Ligue 1", shortName: "Ligue 1",
    country: "France", logo: "https://crests.football-data.org/FL1.png",
    provider: "football-data",
  },
  {
    id: 2017, code: "PPL", name: "Primeira Liga", shortName: "Liga Portugal",
    country: "Portugal", logo: "https://crests.football-data.org/PPL.png",
    provider: "football-data",
  },
  {
    id: 2003, code: "DED", name: "Eredivisie", shortName: "Eredivisie",
    country: "Netherlands", logo: "https://crests.football-data.org/DED.png",
    provider: "football-data",
  },
  {
    id: 2016, code: "ELC", name: "Championship", shortName: "Championship",
    country: "England", logo: "https://crests.football-data.org/ELC.png",
    provider: "football-data",
  },
  {
    id: 2013, code: "BSA", name: "Brasileirão Série A", shortName: "Brasileirão",
    country: "Brazil", logo: "https://crests.football-data.org/BSA.png",
    provider: "football-data",
  },
];

// ─── API-Football leagues — DISABLED ──────────────────────────────
// API-Football free tier only allows seasons 2022-2024 (historical data).
// Current 2025/2026 seasons require a paid plan ($25/mo+).
// To re-enable when you upgrade: uncomment below and update `season` field.

// const API_FOOTBALL_LEAGUES: LeagueConfig[] = [
//   { id: 90128, code: "ARG", name: "Liga Profesional Argentina", shortName: "Argentina",
//     country: "Argentina", logo: "https://media.api-sports.io/football/leagues/128.png",
//     provider: "api-football", apiFootballId: 128, season: 2026 },
//   { id: 90253, code: "MLS", name: "Major League Soccer", shortName: "MLS",
//     country: "USA", logo: "https://media.api-sports.io/football/leagues/253.png",
//     provider: "api-football", apiFootballId: 253, season: 2026 },
//   { id: 90307, code: "SPL", name: "Saudi Pro League", shortName: "Saudi PL",
//     country: "Saudi Arabia", logo: "https://media.api-sports.io/football/leagues/307.png",
//     provider: "api-football", apiFootballId: 307, season: 2025 },
//   { id: 90323, code: "ISL", name: "Indian Super League", shortName: "ISL",
//     country: "India", logo: "https://media.api-sports.io/football/leagues/323.png",
//     provider: "api-football", apiFootballId: 323, season: 2025 },
//   { id: 90262, code: "LMX", name: "Liga MX", shortName: "Liga MX",
//     country: "Mexico", logo: "https://media.api-sports.io/football/leagues/262.png",
//     provider: "api-football", apiFootballId: 262, season: 2025 },
// ];

export const SUPPORTED_LEAGUES: LeagueConfig[] = [
  ...FOOTBALL_DATA_LEAGUES,
  // ...API_FOOTBALL_LEAGUES, // re-enable after upgrading API-Football plan
];

export function getLeagueByCode(code: string): LeagueConfig | undefined {
  return SUPPORTED_LEAGUES.find((l) => l.code === code);
}

export function getLeagueById(id: number): LeagueConfig | undefined {
  return SUPPORTED_LEAGUES.find((l) => l.id === id);
}
