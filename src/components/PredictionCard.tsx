"use client";

import Image from "next/image";
import Link from "next/link";
import { Prediction } from "@/lib/types/football";
import { Star, ChevronRight, Clock } from "lucide-react";

interface PredictionCardProps {
  prediction: Prediction;
}

export default function PredictionCard({ prediction }: PredictionCardProps) {
  const { match, homeWin, draw, awayWin, confidence, verdict, isBettingPick, homePosition, awayPosition } =
    prediction;

  const matchDate = new Date(match.utcDate);
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";
  const isFinished = match.status === "FINISHED";
  const isToday = new Date().toDateString() === matchDate.toDateString();

  return (
    <Link href={`/match/${match.id}`}>
      <div
        className={`group relative overflow-hidden rounded-xl border transition-all active:scale-[0.98] sm:rounded-2xl sm:active:scale-100 sm:hover:scale-[1.005] ${
          isBettingPick
            ? "betting-pick-glow border-betting-gold/40 bg-dark-card"
            : "border-dark-border bg-dark-card"
        }`}
      >
        {/* Top: Time + Badge */}
        <div className="flex items-center justify-between px-3 py-1.5 sm:border-b sm:border-dark-border sm:px-4 sm:py-2">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-slate-500" />
            {isLive ? (
              <span className="text-[11px] font-semibold text-accent-green">LIVE</span>
            ) : isFinished ? (
              <span className="text-[11px] text-slate-500">FT</span>
            ) : (
              <span className={`text-[11px] ${isToday ? "font-medium text-accent-blue" : "text-slate-400"}`}>
                {isToday ? "Today " : ""}
                {matchDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {!isToday && (
                  <span className="ml-1 text-slate-500">
                    {matchDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                )}
              </span>
            )}
          </div>
          {isBettingPick && (
            <div className="flex items-center gap-0.5 rounded-full bg-betting-gold/15 px-2 py-0.5 text-[10px] font-bold text-betting-gold sm:gap-1 sm:px-2.5 sm:text-[11px]">
              <Star className="h-2.5 w-2.5 fill-current sm:h-3 sm:w-3" />
              PICK
            </div>
          )}
        </div>

        {/* Teams Row */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center">
            {/* Home */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Image src={match.homeTeam.crest} alt={match.homeTeam.shortName} width={28} height={28} className="shrink-0 sm:h-8 sm:w-8" unoptimized />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white sm:text-sm">{match.homeTeam.shortName}</p>
                {homePosition && (
                  <span className="text-[10px] text-slate-500">{homePosition}{ordinal(homePosition)}</span>
                )}
              </div>
            </div>

            {/* Center */}
            <div className="mx-2 shrink-0 sm:mx-3">
              {isFinished || isLive ? (
                <div className="text-lg font-bold text-white sm:text-xl">
                  {match.score.fullTime.home} - {match.score.fullTime.away}
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-md bg-dark-bg px-1.5 py-0.5 sm:gap-1.5 sm:rounded-lg sm:px-2">
                  <span className="text-[11px] font-bold text-accent-blue sm:text-xs">{homeWin}%</span>
                  <span className="text-[9px] text-slate-600">·</span>
                  <span className="text-[11px] text-slate-400 sm:text-xs">{draw}%</span>
                  <span className="text-[9px] text-slate-600">·</span>
                  <span className="text-[11px] font-bold text-accent-red sm:text-xs">{awayWin}%</span>
                </div>
              )}
            </div>

            {/* Away */}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <div className="min-w-0 text-right">
                <p className="truncate text-[13px] font-semibold text-white sm:text-sm">{match.awayTeam.shortName}</p>
                {awayPosition && (
                  <span className="text-[10px] text-slate-500">{awayPosition}{ordinal(awayPosition)}</span>
                )}
              </div>
              <Image src={match.awayTeam.crest} alt={match.awayTeam.shortName} width={28} height={28} className="shrink-0 sm:h-8 sm:w-8" unoptimized />
            </div>
          </div>

          {/* Probability Bar */}
          <div className="mt-2.5 sm:mt-3">
            <div className="flex h-1 overflow-hidden rounded-full bg-dark-bg sm:h-1.5">
              <div className="bg-accent-blue transition-all duration-500" style={{ width: `${homeWin}%` }} />
              <div className="bg-slate-500/60 transition-all duration-500" style={{ width: `${draw}%` }} />
              <div className="bg-accent-red transition-all duration-500" style={{ width: `${awayWin}%` }} />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between border-t border-dark-border/50 px-3 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold sm:text-[11px] ${
                verdict === "Home Win"
                  ? "bg-accent-blue/15 text-accent-blue"
                  : verdict === "Away Win"
                    ? "bg-accent-red/15 text-accent-red"
                    : "bg-slate-500/15 text-slate-300"
              }`}
            >
              {verdict}
            </span>
            <ConfidenceDots value={confidence} />
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 sm:h-4 sm:w-4" />
        </div>
      </div>
    </Link>
  );
}

function ConfidenceDots({ value }: { value: number }) {
  const level = value >= 75 ? 4 : value >= 60 ? 3 : value >= 45 ? 2 : 1;
  const color = value >= 75 ? "bg-accent-green" : value >= 60 ? "bg-accent-yellow" : "bg-slate-500";

  return (
    <div className="flex items-center gap-0.5" title={`${value}% confidence`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5 ${i < level ? color : "bg-dark-border"}`} />
      ))}
      <span className="ml-0.5 text-[9px] text-slate-500 sm:ml-1 sm:text-[10px]">{value}%</span>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
