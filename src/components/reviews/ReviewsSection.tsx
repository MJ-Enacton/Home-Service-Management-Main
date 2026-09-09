"use client";

import { useState, useTransition } from "react";

import type {
  ListingReviewSummary,
  RatingBreakdownRow,
  ReviewSort,
} from "@/lib/db/queries/listings";
import { getServiceReviews } from "@/app/services/[id]/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RatingSummary } from "./RatingSummary";
import { ReviewCard } from "./ReviewCard";

interface ReviewsSectionProps {
  listingId: string;
  initialReviews: ListingReviewSummary[];
  ratingAvg: number | null;
  ratingCount: number;
  breakdown: RatingBreakdownRow[];
}

const SORT_TABS: { key: ReviewSort; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "recent", label: "Most recent" },
  { key: "highest", label: "Highest" },
  { key: "lowest", label: "Lowest" },
];

const PAGE_SIZE = 6;

/** Top Reviews: breakdown + sort tabs + show more. Always visible. */
export function ReviewsSection({
  listingId,
  initialReviews,
  ratingAvg,
  ratingCount,
  breakdown,
}: ReviewsSectionProps) {
  const [sort, setSort] = useState<ReviewSort>("top");
  const [reviews, setReviews] = useState(initialReviews);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(
    initialReviews.length >= PAGE_SIZE && ratingCount > initialReviews.length,
  );
  const [isPending, startTransition] = useTransition();

  function handleSort(next: ReviewSort) {
    if (next === sort || isPending) return;
    setSort(next);
    setPage(0);
    startTransition(async () => {
      const result = await getServiceReviews(listingId, next, 0, PAGE_SIZE);
      setReviews(result.reviews);
      setHasMore(
        result.reviews.length >= PAGE_SIZE && result.reviews.length < ratingCount,
      );
    });
  }

  function handleShowMore() {
    if (isPending) return;
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await getServiceReviews(
        listingId,
        sort,
        nextPage,
        PAGE_SIZE,
      );
      setReviews((prev) => [...prev, ...result.reviews]);
      setPage(nextPage);
      setHasMore(
        result.reviews.length >= PAGE_SIZE &&
          reviews.length + result.reviews.length < ratingCount,
      );
    });
  }

  return (
    <section className="border-t py-8 lg:py-10" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-xl font-bold tracking-tight">
        Reviews
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {ratingAvg !== null
            ? `${ratingAvg.toFixed(1)} · ${ratingCount} review${ratingCount === 1 ? "" : "s"}`
            : `${ratingCount} review${ratingCount === 1 ? "" : "s"}`}
        </span>
      </h2>

      {ratingCount === 0 ? (
        <div
          role="status"
          className="mt-5 rounded-xl border border-dashed bg-white py-10 text-center dark:bg-zinc-900"
        >
          <p className="text-sm font-medium">No reviews yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Be the first to share your experience after a completed booking.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <RatingSummary
              avg={ratingAvg}
              count={ratingCount}
              breakdown={breakdown}
            />
          </div>

          <div
            className="mt-5 flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Sort reviews"
          >
            {SORT_TABS.map((tab) => (
              <Button
                key={tab.key}
                role="tab"
                aria-selected={sort === tab.key}
                size="sm"
                variant={sort === tab.key ? "default" : "outline"}
                className={cn("h-8 rounded-full")}
                onClick={() => handleSort(tab.key)}
                disabled={isPending}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {reviews.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No reviews to show for this sort yet.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-5 flex justify-center">
              <Button
                variant="outline"
                onClick={handleShowMore}
                disabled={isPending}
              >
                {isPending
                  ? "Loading…"
                  : `Show more reviews (${reviews.length} of ${ratingCount})`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
