import { Star, Quote } from "lucide-react";
import { desc, eq, sql } from "drizzle-orm";
import { Reveal } from "@/components/ui/reveal";

import { db } from "@/lib/db/db";
import { categories, reviews, serviceListings, user } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";

export async function Reviews() {
  const [stats] = await db
    .select({
      avg: sql<number>`avg(${reviews.rating})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.isVisible, true));

  const avgRating = stats?.avg ? Math.round(stats.avg * 10) / 10 : 0;
  const totalCount = stats?.count ?? 0;

  const items = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      reviewerName: user.name,
      reviewerImage: user.image,
      listingTitle: serviceListings.title,
      categoryName: categories.name,
    })
    .from(reviews)
    .innerJoin(user, eq(reviews.reviewerId, user.id))
    .innerJoin(serviceListings, eq(reviews.listingId, serviceListings.id))
    .leftJoin(categories, eq(serviceListings.categoryId, categories.id))
    .where(eq(reviews.isVisible, true))
    .orderBy(desc(reviews.createdAt))
    .limit(6);

  // Only keep reviews with a comment for testimonials; fallback to rating-only if needed
  const withComment = items.filter(
    (r) => r.comment && r.comment.trim().length > 0,
  );
  const display = (withComment.length > 0 ? withComment : items).slice(0, 6);

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="bg-zinc-50 py-12 dark:bg-zinc-900 dark:border-y dark:border-zinc-800 md:py-16"
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Reviews & Ratings
              </p>
              <h2
                id="reviews-heading"
                className="mt-2 text-2xl font-semibold tracking-tight sm:text-[26px]"
              >
                Loved by homeowners,{" "}
                <span className="font-(--font-display) italic">
                  trusted by pros
                </span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Real reviews only — from completed bookings. No edits, no fake
                stars.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
              <div className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold">
                  {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
              <div className="h-8 w-px bg-border" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{totalCount} reviews</p>
                <p className="text-xs text-muted-foreground">
                  {totalCount === 0
                    ? "Be the first to review"
                    : "Visible & verified"}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {display.length === 0 ? (
          <Reveal>
            <div className="mt-8 rounded-2xl border border-dashed bg-white py-12 text-center dark:bg-zinc-950">
              <Quote className="mx-auto size-6 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-semibold">No reviews yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Completed jobs will appear here as homeowners share their
                experience. Your honest feedback helps neighbors choose with
                confidence.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {display.map((r, i) => (
              <Reveal key={r.id} delay={i * 70}>
                <Card className="flex h-full flex-col rounded-2xl border bg-white p-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-zinc-300 hover:shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span
                        className="flex gap-0.5"
                        aria-label={`${r.rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200 dark:text-zinc-700"}`}
                          />
                        ))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {r.createdAt.toLocaleDateString("en-IN", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <Quote
                      className="mt-4 size-4 text-zinc-300 dark:text-zinc-700"
                      aria-hidden
                    />

                    <blockquote className="mt-2 flex-1 text-sm leading-relaxed">
                      {r.comment && r.comment.trim() ? (
                        <span className="text-foreground">
                          “{r.comment.trim()}”
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Rated {r.rating} out of 5 for {r.listingTitle}.
                        </span>
                      )}
                    </blockquote>

                    <div className="mt-4 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                        {r.reviewerImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.reviewerImage}
                            alt={r.reviewerName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span>
                            {r.reviewerName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {r.reviewerName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.listingTitle}
                          {r.categoryName ? ` · ${r.categoryName}` : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        )}

        {display.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Showing {display.length} of {totalCount} verified reviews · Only
            visible reviews are shown
          </p>
        )}
      </div>
    </section>
  );
}
