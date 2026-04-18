"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import LeagueSelector from "@/components/LeagueSelector";
import { StandingsTableSkeleton } from "@/components/LoadingSkeleton";
import { StandingGroup } from "@/lib/types/football";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";

export default function StandingsPage() {
  const [selectedLeague, setSelectedLeague] = useState("PL");
  const [standings, setStandings] = useState<StandingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStandings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/standings?league=${selectedLeague}`);
      if (!res.ok) throw new Error("Failed to fetch standings");
      const data = await res.json();
      setStandings(data.standings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [selectedLeague]);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  const leagueConfig = SUPPORTED_LEAGUES.find((l) => l.code === selectedLeague);
  const totalTable = standings.find((s) => s.type === "TOTAL")?.table ?? standings[0]?.table ?? [];

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6 lg:max-w-5xl">
        <LeagueSelector selectedLeague={selectedLeague} onSelect={setSelectedLeague} />
        <h1 className="mt-3 text-base font-bold text-white sm:mt-6 sm:text-xl">
          {leagueConfig?.name || "Standings"}
        </h1>

        <div className="mt-2 sm:mt-4">
          {loading ? (
            <StandingsTableSkeleton />
          ) : error ? (
            <div className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-5 text-center">
              <p className="text-sm font-semibold text-accent-red">{error}</p>
            </div>
          ) : (
            <div className="hide-scrollbar overflow-x-auto rounded-xl border border-dark-border bg-dark-card sm:rounded-2xl">
              <table className="w-full min-w-[480px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-dark-border text-[10px] uppercase text-slate-500 sm:text-xs">
                    <th className="w-8 px-2 py-2 text-left sm:w-10 sm:px-3 sm:py-3">#</th>
                    <th className="px-2 py-2 text-left sm:px-3 sm:py-3">Team</th>
                    <th className="w-8 px-1 py-2 text-center sm:w-10 sm:px-2 sm:py-3">P</th>
                    <th className="w-8 px-1 py-2 text-center sm:w-10 sm:px-2 sm:py-3">W</th>
                    <th className="w-8 px-1 py-2 text-center sm:w-10 sm:px-2 sm:py-3">D</th>
                    <th className="w-8 px-1 py-2 text-center sm:w-10 sm:px-2 sm:py-3">L</th>
                    <th className="w-10 px-1 py-2 text-center sm:w-12 sm:px-2 sm:py-3">GD</th>
                    <th className="w-10 px-1 py-2 text-center font-bold sm:w-12 sm:px-2 sm:py-3">Pts</th>
                    <th className="hidden w-24 px-2 py-2 text-center sm:table-cell sm:py-3">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {totalTable.map((entry) => (
                    <tr
                      key={entry.team.id}
                      className="border-b border-dark-border/30 transition active:bg-dark-card-hover sm:hover:bg-dark-card-hover"
                    >
                      <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                        <PositionBadge position={entry.position} total={totalTable.length} />
                      </td>
                      <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                        <div className="flex items-center gap-2">
                          <Image src={entry.team.crest} alt={entry.team.shortName} width={20} height={20} className="shrink-0 sm:h-6 sm:w-6" unoptimized />
                          <span className="truncate text-xs font-medium text-white sm:text-sm">{entry.team.shortName}</span>
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center text-slate-400 sm:px-2">{entry.playedGames}</td>
                      <td className="px-1 py-2 text-center text-slate-300 sm:px-2">{entry.won}</td>
                      <td className="px-1 py-2 text-center text-slate-400 sm:px-2">{entry.draw}</td>
                      <td className="px-1 py-2 text-center text-slate-400 sm:px-2">{entry.lost}</td>
                      <td className="px-1 py-2 text-center sm:px-2">
                        <span className={`font-medium ${entry.goalDifference > 0 ? "text-accent-green" : entry.goalDifference < 0 ? "text-accent-red" : "text-slate-400"}`}>
                          {entry.goalDifference > 0 ? "+" : ""}{entry.goalDifference}
                        </span>
                      </td>
                      <td className="px-1 py-2 text-center font-bold text-white sm:px-2">{entry.points}</td>
                      <td className="hidden px-2 py-2 text-center sm:table-cell">
                        <FormDisplay form={entry.form} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PositionBadge({ position, total }: { position: number; total: number }) {
  let color = "text-slate-400";
  let bar = "bg-transparent";
  if (position <= 4) { color = "text-accent-blue"; bar = "bg-accent-blue"; }
  else if (position <= 6) { color = "text-accent-yellow"; bar = "bg-accent-yellow"; }
  else if (position >= total - 2) { color = "text-accent-red"; bar = "bg-accent-red"; }

  return (
    <div className="flex items-center gap-1">
      <div className={`h-3 w-0.5 rounded-full sm:h-4 sm:w-1 ${bar}`} />
      <span className={`text-xs font-semibold sm:text-sm ${color}`}>{position}</span>
    </div>
  );
}

function FormDisplay({ form }: { form: string | null }) {
  if (!form) return <span className="text-slate-600">—</span>;
  return (
    <div className="flex items-center justify-center gap-0.5">
      {form.split(",").slice(-5).map((c, i) => (
        <span
          key={i}
          className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold sm:h-5 sm:w-5 sm:text-[10px] ${
            c === "W" ? "bg-accent-green/20 text-accent-green"
            : c === "D" ? "bg-slate-500/20 text-slate-400"
            : "bg-accent-red/20 text-accent-red"
          }`}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
