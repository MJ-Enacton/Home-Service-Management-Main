import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

import { listListings } from "@/lib/db/queries/listings";
import { Card, CardContent } from "@/components/ui/card";
import { ListingCard } from "@/components/ListingCard";
import { Reveal } from "@/components/ui/reveal";

export async function PopularServices() {
  const { items: popularListings } = await listListings({
    sort: "rating",
    pageSize: 4,
  });

  return (
    <section className="bg-white py-10 dark:bg-zinc-950 md:py-14">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Most booked this week</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Real services from local pros — tap to see prices, reviews and next available slot.
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Reveal>

        {popularListings.length === 0 ? (
          <Card className="mt-6 border-dashed">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Wrench className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">No services yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">Providers are adding services — check back in a few minutes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popularListings.map((listing, i) => (
              <Reveal key={listing.id} delay={i * 70}>
                <ListingCard listing={listing} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

