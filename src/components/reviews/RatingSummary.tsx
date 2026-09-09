"use client";

import { Star } from "lucide-react";

export type RatingBreakdown = { rating: number; count: number }[];

interface RatingSummaryProps {
  avg: number | null;
  count: number;
  breakdown: RatingBreakdown;
}

/** Average + total + 5→1 distribution bars. */
export function RatingSummary({ avg, count, breakdown }: RatingSummaryProps) {
  const byStar = new Map(breakdown.map((row) => [row.rating, row.count]));

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:gap-8 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <p className="text-4xl font-bold tracking-tight">
          {avg !== null ? avg.toFixed(1) : "—"}
        </p>
        <div className="space-y-1">
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={
                  avg !== null && i < Math.round(avg)
                    ? "size-3.5 fill-amber-400 text-amber-400"
                    : "size-3.5 text-muted-foreground/40"
                }
              />
            ))}
          </span>
          <p className="text-xs text-muted-foreground">
            {count} review{count === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-1.5" aria-label="Rating breakdown">
        {[5, 4, 3, 2, 1].map((star) => {
          const starCount = byStar.get(star) ?? 0;
          const pct = count > 0 ? Math.round((starCount / count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-6 shrink-0 font-medium tabular-nums">
                {star}★
              </span>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${star} stars: ${starCount} reviews`}
              >
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                {starCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
