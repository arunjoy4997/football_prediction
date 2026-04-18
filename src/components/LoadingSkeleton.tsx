"use client";

export function PredictionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card sm:rounded-2xl">
      <div className="flex items-center gap-2 px-3 py-1.5 sm:border-b sm:border-dark-border sm:px-4 sm:py-2">
        <div className="skeleton h-3 w-20" />
      </div>
      <div className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="skeleton h-7 w-7 rounded-full" />
            <div className="skeleton h-3.5 w-20" />
          </div>
          <div className="skeleton h-5 w-20 rounded-md" />
          <div className="flex items-center gap-2">
            <div className="skeleton h-3.5 w-20" />
            <div className="skeleton h-7 w-7 rounded-full" />
          </div>
        </div>
        <div className="mt-2.5 skeleton h-1 w-full rounded-full" />
      </div>
      <div className="flex items-center justify-between border-t border-dark-border/50 px-3 py-1.5 sm:px-4 sm:py-2">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-3 w-10" />
      </div>
    </div>
  );
}

export function StandingsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card sm:rounded-2xl">
      <div className="p-3 space-y-2.5 sm:p-4 sm:space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 sm:gap-3">
            <div className="skeleton h-3 w-4" />
            <div className="skeleton h-5 w-5 rounded-full" />
            <div className="skeleton h-3 w-24" />
            <div className="ml-auto skeleton h-3 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
