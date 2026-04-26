import { LeagueConfig } from "@/lib/types/football";

// football-data.org competition codes (free tier)
export const SUPPORTED_LEAGUES: LeagueConfig[] = [
  {
    id: 2001,
    code: "CL",
    name: "UEFA Champions League",
    shortName: "UCL",
    country: "Europe",
    logo: "https://crests.football-data.org/CL.png",
  },
  {
    id: 2021,
    code: "PL",
    name: "Premier League",
    shortName: "PL",
    country: "England",
    logo: "https://crests.football-data.org/PL.png",
  },
  {
    id: 2014,
    code: "PD",
    name: "La Liga",
    shortName: "La Liga",
    country: "Spain",
    logo: "https://crests.football-data.org/PD.png",
  },
  {
    id: 2019,
    code: "SA",
    name: "Serie A",
    shortName: "Serie A",
    country: "Italy",
    logo: "https://crests.football-data.org/SA.png",
  },
  {
    id: 2002,
    code: "BL1",
    name: "Bundesliga",
    shortName: "Bundesliga",
    country: "Germany",
    logo: "https://crests.football-data.org/BL1.png",
  },
  {
    id: 2015,
    code: "FL1",
    name: "Ligue 1",
    shortName: "Ligue 1",
    country: "France",
    logo: "https://crests.football-data.org/FL1.png",
  },
  {
    id: 2017,
    code: "PPL",
    name: "Primeira Liga",
    shortName: "Liga Portugal",
    country: "Portugal",
    logo: "https://crests.football-data.org/PPL.png",
  },
  {
    id: 2003,
    code: "DED",
    name: "Eredivisie",
    shortName: "Eredivisie",
    country: "Netherlands",
    logo: "https://crests.football-data.org/DED.png",
  },
  {
    id: 2016,
    code: "ELC",
    name: "Championship",
    shortName: "Championship",
    country: "England",
    logo: "https://crests.football-data.org/ELC.png",
  },
  {
    id: 2013,
    code: "BSA",
    name: "Brasileirão Série A",
    shortName: "Brasileirão",
    country: "Brazil",
    logo: "https://crests.football-data.org/BSA.png",
  },
];

export function getLeagueByCode(code: string): LeagueConfig | undefined {
  return SUPPORTED_LEAGUES.find((l) => l.code === code);
}

export function getLeagueById(id: number): LeagueConfig | undefined {
  return SUPPORTED_LEAGUES.find((l) => l.id === id);
}
