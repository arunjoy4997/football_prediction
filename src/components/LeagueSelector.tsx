"use client";

import Image from "next/image";
import { SUPPORTED_LEAGUES } from "@/lib/config/leagues";

interface LeagueSelectorProps {
  selectedLeague: string;
  onSelect: (code: string) => void;
}

export default function LeagueSelector({
  selectedLeague,
  onSelect,
}: LeagueSelectorProps) {
  return (
    <div className="hide-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:-mx-0 sm:gap-2 sm:px-0">
      {SUPPORTED_LEAGUES.map((league) => (
        <button
          key={league.code}
          onClick={() => onSelect(league.code)}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition active:scale-95 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm ${
            selectedLeague === league.code
              ? "bg-accent-blue text-white shadow-md shadow-accent-blue/20"
              : "bg-dark-card text-slate-300 active:bg-dark-card-hover"
          }`}
        >
          <Image
            src={league.logo}
            alt={league.name}
            width={18}
            height={18}
            className="rounded-sm sm:h-5 sm:w-5"
            unoptimized
          />
          {league.shortName}
        </button>
      ))}
    </div>
  );
}
