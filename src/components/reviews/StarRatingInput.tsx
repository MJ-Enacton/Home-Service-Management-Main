"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** Accessible 1–5 star selector used by the review form. */
export function StarRatingInput({
  value,
  onChange,
  disabled = false,
}: StarRatingInputProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        role="radiogroup"
        aria-label="Your rating"
        className="flex justify-center gap-1.5"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}${RATING_LABELS[star] ? ` — ${RATING_LABELS[star]}` : ""}`}
            disabled={disabled}
            onClick={() => onChange(star)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" && star < 5) onChange(star + 1);
              if (event.key === "ArrowLeft" && star > 1) onChange(star - 1);
            }}
            className="rounded-sm transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Star
              className={cn(
                "size-8",
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <p
        aria-live="polite"
        className={cn(
          "h-4 text-xs font-medium",
          value > 0 ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {value > 0 ? RATING_LABELS[value] : "Tap a star to rate"}
      </p>
    </div>
  );
}
