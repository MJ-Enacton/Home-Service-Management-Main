import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

import { listListings } from "@/lib/db/queries/listings";
import { Card, CardContent } from "@/components/ui/card";
import { ListingCard } from "@/components/ListingCard";

export async function PopularServices() {
  const { items: popularListings } = await listListings({
    sort: "rating",
    pageSize: 6,
  });

  return (
    <section className="border-t bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Popular services</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              A glimpse of what our professionals can help you with today.
            </p>
          </div>
          <Link
            href="/allservices"
            className="group flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            View all services
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {popularListings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Wrench className="size-8 text-muted-foreground" />
              <p className="font-medium">Services are coming soon</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Our catalog is being prepared right now. Check back shortly!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popularListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
