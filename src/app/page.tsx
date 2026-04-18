"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import LeagueSelector from "@/components/LeagueSelector";
import PredictionCard from "@/components/PredictionCard";
import { PredictionCardSkeleton } from "@/components/LoadingSkeleton";
import { Prediction } from "@/lib/types/football";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";
import { Filter, Flame, RefreshCw, CalendarDays } from "lucide-react";

interface GameweekGroup {
  matchday: number | null;
  dateRange: string;
  predictions: Prediction[];
}

function groupByMatchday(predictions: Prediction[]): GameweekGroup[] {
  const groups = new Map<number | null, Prediction[]>();
  const sorted = [...predictions].sort(
    (a, b) => new Date(a.match.utcDate).getTime() - new Date(b.match.utcDate).getTime()
  );

  for (const p of sorted) {
    const md = p.match.matchday;
    if (!groups.has(md)) groups.set(md, []);
    groups.get(md)!.push(p);
  }

  return Array.from(groups.entries()).map(([matchday, preds]) => {
    const dates = preds.map((p) => new Date(p.match.utcDate));
    const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
    const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const dateRange =
      earliest.toDateString() === latest.toDateString()
        ? fmt(earliest)
        : `${fmt(earliest)} — ${fmt(latest)}`;

    preds.sort((a, b) => {
      if (a.isBettingPick !== b.isBettingPick) return a.isBettingPick ? -1 : 1;
      return b.confidence - a.confidence;
    });

    return { matchday, dateRange, predictions: preds };
  });
}

export default function HomePage() {
  const [selectedLeague, setSelectedLeague] = useState("PL");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBettingOnly, setShowBettingOnly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPredictions = useCallback(async (league: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/predictions?league=${league}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch predictions");
      const data = await res.json();
      if (!controller.signal.aborted) {
        setPredictions(data.predictions || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions(selectedLeague);
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [selectedLeague, fetchPredictions]);

  const filtered = showBettingOnly ? predictions.filter((p) => p.isBettingPick) : predictions;
  const gameweeks = groupByMatchday(filtered);
  const bettingCount = predictions.filter((p) => p.isBettingPick).length;
  const leagueConfig = SUPPORTED_LEAGUES.find((l) => l.code === selectedLeague);

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6 lg:max-w-5xl">
        <LeagueSelector selectedLeague={selectedLeague} onSelect={setSelectedLeague} />

        {/* Controls */}
        <div className="mt-3 flex items-center justify-between gap-2 sm:mt-6">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-xl">
              {leagueConfig?.name || "Predictions"}
            </h1>
            <p className="text-[11px] text-slate-400 sm:text-sm">
              {predictions.length} match{predictions.length !== 1 && "es"}
              {bettingCount > 0 && (
                <span className="ml-1.5 text-betting-gold">
                  {bettingCount} pick{bettingCount !== 1 && "s"}
                </span>
              )}
              {lastUpdated && (
                <span className="ml-1.5 text-slate-600">
                  {lastUpdated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setShowBettingOnly(!showBettingOnly)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition active:scale-95 sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm ${
                showBettingOnly
                  ? "bg-betting-gold/20 text-betting-gold"
                  : "bg-dark-card text-slate-300"
              }`}
            >
              <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Betting </span>Picks
            </button>
            <button
              onClick={() => fetchPredictions(selectedLeague)}
              disabled={loading}
              className="flex items-center rounded-lg bg-dark-card p-1.5 text-slate-300 transition active:scale-95 disabled:opacity-50 sm:gap-1.5 sm:px-3 sm:py-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden text-sm sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-3 sm:mt-6">
          {loading ? (
            <div className="space-y-2.5 sm:space-y-4">
              <div className="skeleton h-6 w-36 rounded-lg" />
              {Array.from({ length: 4 }).map((_, i) => <PredictionCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-5 text-center">
              <p className="text-sm font-semibold text-accent-red">Error</p>
              <p className="mt-1 text-xs text-slate-400">{error}</p>
              <button
                onClick={() => fetchPredictions(selectedLeague)}
                className="mt-3 rounded-lg bg-accent-red/20 px-4 py-2 text-xs font-medium text-accent-red active:scale-95"
              >
                Try Again
              </button>
            </div>
          ) : gameweeks.length === 0 ? (
            <div className="rounded-xl border border-dark-border bg-dark-card p-6 text-center">
              <Filter className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-2 text-sm font-medium text-slate-300">
                {showBettingOnly ? "No betting picks right now" : "No upcoming fixtures"}
              </p>
            </div>
          ) : (
            <div className="space-y-5 sm:space-y-8">
              {gameweeks.map((gw) => (
                <section key={gw.matchday ?? "unscheduled"}>
                  {/* Gameweek Header */}
                  <div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
                    <div className="flex items-center gap-1.5 rounded-md bg-dark-card px-2 py-1 sm:gap-2 sm:rounded-lg sm:px-3 sm:py-1.5">
                      <CalendarDays className="h-3 w-3 text-accent-blue sm:h-4 sm:w-4" />
                      <span className="text-xs font-semibold text-white sm:text-sm">
                        {gw.matchday ? `GW ${gw.matchday}` : "Upcoming"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 sm:text-xs">{gw.dateRange}</span>
                    <div className="h-px flex-1 bg-dark-border" />
                    <span className="text-[10px] text-slate-600 sm:text-xs">
                      {gw.predictions.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 sm:space-y-3">
                    {gw.predictions.map((prediction) => (
                      <PredictionCard key={prediction.match.id} prediction={prediction} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
