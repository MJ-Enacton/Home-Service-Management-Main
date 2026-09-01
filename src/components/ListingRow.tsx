import {
  Calendar,
  Clock,
  Hammer,
  MapPin,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import { enumLabel, formatCents, pricingUnitLabel } from "@/lib/format";
import type { ServiceListingCard } from "@/types/service";
import { useState } from "react";

export default function ListingRow({
  listing,
}: {
  listing: ServiceListingCard;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      href={`/services/${listing.id}`}
      className="group flex gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative w-40 shrink-0 overflow-hidden rounded-lg sm:w-52">
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
            className="h-28 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:h-full"
            loading="lazy"
          />
        )}
        {listing.categoryName && (
          <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm dark:bg-zinc-900/95 dark:text-zinc-100">
            {listing.categoryName}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {listing.isVerified && (
                <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-white shadow-sm">
                  <ShieldCheck className="size-3.5" />
                  Verified
                </span>
              )}
              <span className="flex items-center gap-1 text-sm">
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
            <h3 className="mt-1.5 line-clamp-1 font-semibold">
              {listing.title}
            </h3>
          </div>
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {listing.description || "Professional service at your doorstep."}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
          <div className="space-y-1 text-sm text-muted-foreground">
            {listing.location && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {listing.location}
              </p>
            )}
            {listing.estimatedDuration && (
              <p className="flex items-center gap-1.5">
                <Calendar className="size-3.5 shrink-0" />
                {enumLabel(listing.pricingType)} · {listing.estimatedDuration}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Starting from
              <span className="ml-1.5 text-lg font-bold text-foreground">
                {formatCents(listing.startingPriceCents, { withCents: false })}
              </span>
              <span className="text-xs">
                /{pricingUnitLabel(listing.pricingType)}
              </span>
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-primary/90">
              <Clock className="size-3.5" />
              View Deal
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
