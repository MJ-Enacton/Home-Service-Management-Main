"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, Hammer, MapPin, Star } from "lucide-react";

import type { ServiceListingCard as ListingCardData } from "@/types/service";
import { enumLabel, formatCents, pricingUnitLabel } from "@/lib/format";

interface ListingCardProps {
  listing: ListingCardData;
}

/** Grid card for a service listing (home "top rated" + browse pages). */
export function ListingCard({ listing }: ListingCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      href={`/services/${listing.id}`}
      className="group block overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative">
        {imageFailed ? (
          <div className="flex h-44 w-full items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40">
            <Hammer className="size-10 text-blue-300 dark:text-blue-700" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/services/${listing.id}/image`}
            alt={listing.title}
            onError={() => setImageFailed(true)}
            className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        )}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          {listing.categoryName && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm dark:bg-zinc-900/95 dark:text-zinc-100">
              {listing.categoryName}
            </span>
          )}
          {listing.isVerified && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-white shadow-sm">
              <BadgeCheck className="size-3.5" />
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              {listing.provider.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {listing.provider.name}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-semibold">
              {listing.ratingAvg !== null
                ? listing.ratingAvg.toFixed(1)
                : "New"}
            </span>
            {listing.ratingCount > 0 && (
              <span className="text-muted-foreground">
                ({listing.ratingCount})
              </span>
            )}
          </span>
        </div>

        <h3 className="line-clamp-2 font-semibold leading-snug">
          {listing.title}
        </h3>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {listing.description || "Professional service at your doorstep."}
        </p>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          {listing.location && (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              {listing.location}
            </p>
          )}
          {listing.estimatedDuration && (
            <p className="flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              {listing.estimatedDuration}
            </p>
          )}
        </div>

        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listing.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {enumLabel(tag)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-sm text-muted-foreground">
            Starting from
            <span className="ml-1.5 text-lg font-bold text-foreground">
              {formatCents(listing.startingPriceCents, { withCents: false })}
            </span>
            {!listing.hasTiers && (
              <span className="text-xs">
                /{pricingUnitLabel(listing.pricingType)}
              </span>
            )}
          </p>
          <span className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-primary/90">
            Book now
          </span>
        </div>
      </div>
    </Link>
  );
}
