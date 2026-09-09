import type { InferSelectModel } from "drizzle-orm";

import type {
  serviceListings,
  serviceTiers,
  categories,
} from "@/lib/db/schema";

export type ServiceListing = InferSelectModel<typeof serviceListings>;
export type ServiceTier = InferSelectModel<typeof serviceTiers>;
export type ListingCategory = InferSelectModel<typeof categories>;

export type PricingType = ServiceListing["pricingType"];
export type ListingStatus = ServiceListing["status"];

/** Provider info embedded on listing cards / detail pages */
export interface ListingProviderSummary {
  id: string;
  name: string;
  image: string | null;
}

/** Card shown in the services grid and home "top rated" section */
export interface ServiceListingCard {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string | null;
  categorySlug: string | null;
  provider: ListingProviderSummary;
  pricingType: PricingType;
  /** lowest price across basePrice and tiers, in cents */
  startingPriceCents: number;
  /** whether the listing has pricing tiers */
  hasTiers: boolean;
  location: string | null;
  estimatedDuration: string | null;
  tags: string[];
  /** aggregate review stats (null when the listing has no reviews yet) */
  ratingAvg: number | null;
  ratingCount: number;
  /** whether this listing has an image (or its category has a fallback image) */
  hasImage: boolean;
  /** Cloudinary public_id of the cover image (first gallery image), if migrated */
  coverImagePublicId: string | null;
}

/** Detail-page payload */
export interface ServiceListingDetail extends ServiceListingCard {
  createdAt: Date;
  updatedAt: Date;
}

export interface TierOption {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
}
