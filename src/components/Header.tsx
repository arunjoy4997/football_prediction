"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, BarChart3, TrendingUp } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-dark-border bg-dark-bg/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
        <Link href="/" className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-blue sm:h-8 sm:w-8">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white sm:text-lg">
            F<span className="text-accent-blue">P</span>
            <span className="hidden sm:inline">
              ootball<span className="text-accent-blue">redict</span>
            </span>
          </span>
        </Link>
        <nav className="flex items-center">
          <Link
            href="/"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm ${
              pathname === "/"
                ? "bg-accent-blue/15 text-accent-blue"
                : "text-slate-400 active:bg-dark-card"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Predictions
          </Link>
          <Link
            href="/standings"
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm ${
              pathname === "/standings"
                ? "bg-accent-blue/15 text-accent-blue"
                : "text-slate-400 active:bg-dark-card"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Standings
          </Link>
        </nav>
      </div>
    </header>
  );
}
