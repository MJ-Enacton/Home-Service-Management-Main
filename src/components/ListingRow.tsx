import { Calendar, Clock, Hammer, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { enumLabel, formatCents, pricingUnitLabel } from "@/lib/format";
import type { ServiceListingCard } from "@/types/service";
import { ListingCoverImage } from "@/components/ListingCoverImage";
import { useState } from "react";

export default function ListingRow({
  listing,
}: {
  listing: ServiceListingCard;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(listing.hasImage) && !imageFailed;

  return (
    <Link
      href={`/services/${listing.id}`}
      className="group flex flex-col gap-3 overflow-hidden rounded-xl border bg-white p-3 transition hover:border-zinc-300 sm:flex-row dark:bg-zinc-900 dark:border-zinc-800"
    >
      <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-zinc-50 sm:w-48 dark:bg-zinc-800">
        {!showImage ? (
          <div className="flex h-36 w-full items-center justify-center sm:h-full">
            <Hammer className="size-5 text-zinc-400" />
          </div>
        ) : (
          <ListingCoverImage
            publicId={listing.coverImagePublicId}
            alt={listing.title}
            className="h-36 w-full object-cover sm:h-full"
            sizes="(max-width: 640px) 100vw, 200px"
            width={400}
            height={300}
            onMissing={() => setImageFailed(true)}
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

        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium whitespace-nowrap text-white transition-colors group-hover:bg-primary/90">
              <Clock className="size-3.5" />
              View Deal
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
