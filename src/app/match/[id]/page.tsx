"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Prediction, PredictionFactor, Match, StandingEntry, H2HAggregates,
} from "@/lib/types/football";
import {
  ArrowLeft, Star, TrendingUp, Home, Swords, BarChart3, Target, Timer,
  Shield, ChevronDown, ChevronUp, Zap, Flag, Users,
} from "lucide-react";

interface MatchData {
  prediction: Prediction;
  h2hMatches: Match[];
  h2hAggregates: H2HAggregates | null;
  standings: StandingEntry[];
}

export default function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllFactors, setShowAllFactors] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/match/${id}`);
        if (!res.ok) throw new Error("Failed to load match data");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally { setLoading(false); }
    }
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-2xl px-3 py-4">
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}</div>
      </main>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-2xl px-3 py-8 text-center">
        <p className="text-sm text-accent-red">{error || "Match not found"}</p>
        <Link href="/" className="mt-3 inline-block text-sm text-accent-blue">Back to predictions</Link>
      </main>
    </div>
  );

  const { prediction, h2hMatches } = data;
  const { match } = prediction;
  const matchDate = new Date(match.utcDate);

  return (
    <div className="min-h-dvh">
      <Header />
      <main className="mx-auto max-w-2xl px-3 py-3 sm:px-4 sm:py-6 lg:max-w-4xl">
        <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 active:text-white sm:mb-4 sm:text-sm">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        {/* ── Match Header ── */}
        <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card sm:rounded-2xl">
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 text-[11px] text-slate-400 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
            {match.competition.emblem && (
              <Image src={match.competition.emblem} alt="" width={14} height={14} className="rounded-sm sm:h-[18px] sm:w-[18px]" unoptimized />
            )}
            <span>{match.competition.name}</span>
            <span className="text-slate-600">·</span>
            <span>
              {matchDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            {match.matchday && <><span className="text-slate-600">·</span><span>MD {match.matchday}</span></>}
          </div>

          <div className="flex items-center justify-between px-4 py-5 sm:px-6 sm:py-8">
            <div className="flex flex-1 flex-col items-center gap-2">
              <Image src={match.homeTeam.crest} alt={match.homeTeam.shortName} width={48} height={48} className="sm:h-16 sm:w-16" unoptimized />
              <h2 className="text-center text-xs font-bold text-white sm:text-lg">{match.homeTeam.shortName}</h2>
              {prediction.homePosition && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 sm:text-xs">
                  <Shield className="h-2.5 w-2.5" />{prediction.homePosition}{ordinal(prediction.homePosition)}
                </span>
              )}
            </div>
            <div className="px-2 sm:px-4">
              {match.status === "FINISHED" ? (
                <div className="text-2xl font-bold text-white sm:text-4xl">{match.score.fullTime.home} - {match.score.fullTime.away}</div>
              ) : (
                <div className="rounded-lg bg-dark-bg px-3 py-1.5 text-sm font-bold text-slate-400 sm:rounded-xl sm:px-5 sm:py-2 sm:text-xl">VS</div>
              )}
            </div>
            <div className="flex flex-1 flex-col items-center gap-2">
              <Image src={match.awayTeam.crest} alt={match.awayTeam.shortName} width={48} height={48} className="sm:h-16 sm:w-16" unoptimized />
              <h2 className="text-center text-xs font-bold text-white sm:text-lg">{match.awayTeam.shortName}</h2>
              {prediction.awayPosition && (
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 sm:text-xs">
                  <Shield className="h-2.5 w-2.5" />{prediction.awayPosition}{ordinal(prediction.awayPosition)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Prediction ── */}
        <div className={`mt-3 rounded-xl border p-3 sm:mt-4 sm:rounded-2xl sm:p-5 ${prediction.isBettingPick ? "betting-pick-glow border-betting-gold/40 bg-dark-card" : "border-dark-border bg-dark-card"}`}>
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-white sm:gap-2 sm:text-base">
              <TrendingUp className="h-4 w-4 text-accent-blue" /> Prediction
            </h3>
            {prediction.isBettingPick && (
              <span className="flex items-center gap-0.5 rounded-full bg-betting-gold/20 px-2 py-0.5 text-[10px] font-semibold text-betting-gold sm:gap-1 sm:px-3 sm:py-1 sm:text-sm">
                <Star className="h-3 w-3 fill-current" /> PICK
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2.5 sm:mt-4 sm:space-y-3">
            <ProbRow label={match.homeTeam.shortName} value={prediction.homeWin} color="bg-accent-blue" isHighest={prediction.verdict === "Home Win"} />
            <ProbRow label="Draw" value={prediction.draw} color="bg-slate-500" isHighest={prediction.verdict === "Draw"} />
            <ProbRow label={match.awayTeam.shortName} value={prediction.awayWin} color="bg-accent-red" isHighest={prediction.verdict === "Away Win"} />
          </div>

          {/* Confidence */}
          <div className="mt-3 flex items-center justify-between rounded-lg bg-dark-bg p-2.5 sm:mt-4 sm:rounded-xl sm:p-3">
            <span className="text-xs text-slate-400 sm:text-sm">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-dark-border sm:h-2 sm:w-24">
                <div
                  className={`confidence-bar h-full rounded-full ${prediction.confidence >= 75 ? "bg-accent-green" : prediction.confidence >= 60 ? "bg-accent-yellow" : "bg-accent-red"}`}
                  style={{ "--bar-width": `${prediction.confidence}%` } as React.CSSProperties}
                />
              </div>
              <span className={`text-xs font-bold sm:text-sm ${prediction.confidence >= 75 ? "text-accent-green" : prediction.confidence >= 60 ? "text-accent-yellow" : "text-accent-red"}`}>
                {prediction.confidence}%
              </span>
            </div>
          </div>

          <div className="mt-2.5 text-center sm:mt-3">
            <span className={`inline-block rounded-lg px-3 py-1.5 text-xs font-bold sm:px-4 sm:py-2 sm:text-sm ${prediction.verdict === "Home Win" ? "bg-accent-blue/15 text-accent-blue" : prediction.verdict === "Away Win" ? "bg-accent-red/15 text-accent-red" : "bg-slate-500/15 text-slate-300"}`}>
              {prediction.verdict}
            </span>
          </div>
        </div>

        {/* ── Why This Prediction ── */}
        <div className="mt-3 rounded-xl border border-dark-border bg-dark-card p-3 sm:mt-4 sm:rounded-2xl sm:p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-white sm:gap-2 sm:text-base">
            <BarChart3 className="h-4 w-4 text-accent-purple" /> Why This Prediction
          </h3>
          <div className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
            {(showAllFactors ? prediction.factors : prediction.factors.slice(0, 4)).map((factor, i) => (
              <FactorRow key={i} factor={factor} />
            ))}
          </div>
          {prediction.factors.length > 4 && (
            <button onClick={() => setShowAllFactors(!showAllFactors)} className="mt-2 flex items-center gap-1 text-xs text-accent-blue active:underline sm:mt-3 sm:text-sm">
              {showAllFactors ? <>Less <ChevronUp className="h-3.5 w-3.5" /></> : <>All {prediction.factors.length} factors <ChevronDown className="h-3.5 w-3.5" /></>}
            </button>
          )}
        </div>

        {/* ── H2H ── */}
        {h2hMatches.length > 0 && (
          <div className="mt-3 rounded-xl border border-dark-border bg-dark-card p-3 sm:mt-4 sm:rounded-2xl sm:p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-white sm:gap-2 sm:text-base">
              <Swords className="h-4 w-4 text-accent-yellow" /> H2H — Last {h2hMatches.length}
            </h3>
            <div className="mt-2.5 space-y-1.5 sm:mt-3 sm:space-y-2">
              {h2hMatches.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-dark-bg px-2.5 py-2 text-[11px] sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm">
                  <span className="shrink-0 text-slate-500">
                    {new Date(m.utcDate).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <span className={`text-right ${m.score.winner === "HOME_TEAM" ? "font-semibold text-white" : "text-slate-400"}`}>
                      {m.homeTeam.shortName}
                    </span>
                    <span className="rounded bg-dark-card px-1.5 py-0.5 font-bold text-white">
                      {m.score.fullTime.home}-{m.score.fullTime.away}
                    </span>
                    <span className={`${m.score.winner === "AWAY_TEAM" ? "font-semibold text-white" : "text-slate-400"}`}>
                      {m.awayTeam.shortName}
                    </span>
                  </div>
                  <span className="hidden text-[10px] text-slate-600 sm:inline">{m.competition.code}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats Comparison ── */}
        {data.standings.length === 2 && (
          <div className="mt-3 rounded-xl border border-dark-border bg-dark-card p-3 sm:mt-4 sm:rounded-2xl sm:p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-white sm:gap-2 sm:text-base">
              <Target className="h-4 w-4 text-accent-green" /> Season Stats
            </h3>
            <div className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5">
              <StatCompare label="Wins" homeVal={data.standings[0].won} awayVal={data.standings[1].won} />
              <StatCompare label="Goals" homeVal={data.standings[0].goalsFor} awayVal={data.standings[1].goalsFor} />
              <StatCompare label="Conceded" homeVal={data.standings[0].goalsAgainst} awayVal={data.standings[1].goalsAgainst} inverse />
              <StatCompare label="Points" homeVal={data.standings[0].points} awayVal={data.standings[1].points} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ProbRow({ label, value, color, isHighest }: { label: string; value: number; color: string; isHighest: boolean }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className={`w-20 truncate text-xs sm:w-32 sm:text-sm ${isHighest ? "font-semibold text-white" : "text-slate-400"}`}>{label}</span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-dark-bg sm:h-3">
          <div className={`h-full rounded-full transition-all duration-500 ${color} ${isHighest ? "opacity-100" : "opacity-60"}`} style={{ width: `${value}%` }} />
        </div>
      </div>
      <span className={`w-9 text-right text-xs font-bold sm:w-12 sm:text-sm ${isHighest ? "text-white" : "text-slate-500"}`}>{value}%</span>
    </div>
  );
}

function FactorRow({ factor }: { factor: PredictionFactor }) {
  const iconMap: Record<string, typeof TrendingUp> = {
    "Current Form": TrendingUp, "Home/Away Record": Home, "Head to Head": Swords,
    "League Position": BarChart3, "Goal Statistics": Target, "Fixture Congestion": Timer,
    "Motivation": Flag, "Squad Rotation": Users, "Momentum": Zap, "Derby Match": Swords,
    "2nd Leg Dynamics": Swords, "Knockout Match": Swords,
  };
  const Icon = iconMap[factor.name] || BarChart3;
  const impactColor = factor.impact === "home" ? "text-accent-blue" : factor.impact === "away" ? "text-accent-red" : "text-slate-400";

  return (
    <div className="flex items-start gap-2 rounded-lg bg-dark-bg px-2.5 py-2 sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${impactColor}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-200 sm:text-sm">{factor.name}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400 sm:text-xs">{factor.description}</p>
      </div>
      <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold capitalize sm:px-1.5 sm:text-xs ${factor.impact === "home" ? "bg-accent-blue/15 text-accent-blue" : factor.impact === "away" ? "bg-accent-red/15 text-accent-red" : "bg-slate-500/15 text-slate-400"}`}>
        {factor.impact}
      </span>
    </div>
  );
}

function StatCompare({ label, homeVal, awayVal, inverse = false }: { label: string; homeVal: number; awayVal: number; inverse?: boolean }) {
  const homeBetter = inverse ? homeVal < awayVal : homeVal > awayVal;
  const awayBetter = inverse ? awayVal < homeVal : awayVal > homeVal;
  const maxVal = Math.max(Math.abs(homeVal), Math.abs(awayVal)) || 1;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className={`w-7 text-right text-xs font-bold sm:w-10 sm:text-sm ${homeBetter ? "text-accent-green" : "text-slate-400"}`}>{homeVal}</span>
      <div className="flex flex-1 items-center gap-0.5 sm:gap-1">
        <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-l-full bg-dark-bg sm:h-2">
          <div className={`rounded-l-full ${homeBetter ? "bg-accent-green" : "bg-slate-600"}`} style={{ width: `${(Math.abs(homeVal) / maxVal) * 100}%` }} />
        </div>
        <span className="w-16 text-center text-[10px] text-slate-500 sm:w-24 sm:text-xs">{label}</span>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-r-full bg-dark-bg sm:h-2">
          <div className={`rounded-r-full ${awayBetter ? "bg-accent-green" : "bg-slate-600"}`} style={{ width: `${(Math.abs(awayVal) / maxVal) * 100}%` }} />
        </div>
      </div>
      <span className={`w-7 text-left text-xs font-bold sm:w-10 sm:text-sm ${awayBetter ? "text-accent-green" : "text-slate-400"}`}>{awayVal}</span>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
