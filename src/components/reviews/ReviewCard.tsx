"use client";

import { Star } from "lucide-react";

import type { ListingReviewSummary } from "@/lib/db/queries/listings";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatReviewDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Single review display card for service pages. */
export function ReviewCard({ review }: { review: ListingReviewSummary }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className="flex items-center gap-0.5"
            role="img"
            aria-label={`${review.rating} out of 5 stars`}
          >
            {Array.from({ length: 5 }, (_, starIndex) => (
              <Star
                key={starIndex}
                className={cn(
                  "size-3.5",
                  starIndex < review.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40",
                )}
              />
            ))}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatReviewDate(review.createdAt)}
          </span>
        </div>
        {review.comment ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            “{review.comment}”
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/70 italic">
            Rated {review.rating} out of 5 — no written comment.
          </p>
        )}
        <p className="text-xs font-medium text-foreground">
          {review.reviewerName}
        </p>
      </CardContent>
    </Card>
  );
}
