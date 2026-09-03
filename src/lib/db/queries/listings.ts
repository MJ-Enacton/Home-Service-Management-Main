import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db/db";
import {
  categories,
  listingImages,
  reviews,
  serviceListings,
  serviceTiers,
  user,
} from "@/lib/db/schema";
import type {
  ListingStatus,
  ServiceListingCard,
  TierOption,
} from "@/types/service";

export type ListingSort = "recommended" | "price-asc" | "price-desc" | "rating";

export interface ListingFilters {
  /** category slugs (match categories.slug, e.g. "plumbing") */
  categories?: string[];
  /** cents, inclusive */
  minPrice?: number;
  maxPrice?: number;
  /** inclusive minimum average rating (e.g. 4 => "4+") */
  minRating?: number;
  /** free-text match against title/description */
  search?: string;
}

export interface ListListingsOptions {
  filters?: ListingFilters;
  sort?: ListingSort;
  page?: number;
  pageSize?: number;
}

// --- Shared subqueries -------------------------------------------------

const ratingAgg = db
  .select({
    listingId: reviews.listingId,
    avgRating: sql<number>`avg(${reviews.rating})::float`.as("avg_rating"),
    reviewCount: sql<number>`count(*)::int`.as("review_count"),
  })
  .from(reviews)
  .where(eq(reviews.isVisible, true))
  .groupBy(reviews.listingId)
  .as("rating_agg");

const tierMin = db
  .select({
    listingId: serviceTiers.listingId,
    minTierPrice: sql<number>`min(${serviceTiers.price})::int`.as(
      "min_tier_price",
    ),
    hasTiers: sql<boolean>`count(*) > 0`.as("has_tiers"),
  })
  .from(serviceTiers)
  .groupBy(serviceTiers.listingId)
  .as("min_tier_price");

/** Cheapest of base price / tier prices */
const effectivePriceSql = sql<number>`least(${serviceListings.basePrice}, coalesce(${tierMin.minTierPrice}, ${serviceListings.basePrice}))`;

// --- Row mapping --------------------------------------------------------

interface ListingRow {
  id: string;
  title: string;
  description: string | null;
  pricingType: (typeof serviceListings.$inferSelect)["pricingType"];
  categoryId: string;
  basePrice: number;
  location: string | null;
  estimatedDuration: string | null;
  tags: unknown;
  categoryName: string | null;
  categorySlug: string | null;
  providerId: string;
  providerName: string;
  providerImage: string | null;
  minTierPrice: number | null;
  hasTiers: boolean;
  avgRating: number | null;
  reviewCount: number;
  hasImage: boolean;
}

function rowToCard(row: ListingRow): ServiceListingCard {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    provider: {
      id: row.providerId,
      name: row.providerName,
      image: row.providerImage,
    },
    pricingType: row.pricingType,
    startingPriceCents:
      row.minTierPrice !== null && row.minTierPrice < row.basePrice
        ? row.minTierPrice
        : row.basePrice,
    hasTiers: row.hasTiers,
    location: row.location,
    estimatedDuration: row.estimatedDuration,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    ratingAvg:
      row.avgRating === null ? null : Math.round(row.avgRating * 10) / 10,
    ratingCount: row.reviewCount,
    hasImage: row.hasImage ?? false,
  };
}

// --- Public API ---------------------------------------------------------

/**
 * Active listings with aggregate stats (visible-review average rating,
 * cheapest tier price) for browse/home screens.
 */
export async function listListings(
  options: ListListingsOptions = {},
): Promise<{ items: ServiceListingCard[]; total: number }> {
  const {
    filters = {},
    sort = "recommended",
    page = 1,
    pageSize = 12,
  } = options;

  const conditions = [eq(serviceListings.status, "active")];

  if (filters.categories?.length) {
    conditions.push(inArray(categories.slug, filters.categories));
  }
  if (filters.minRating !== undefined) {
    conditions.push(
      gte(sql`coalesce(${ratingAgg.avgRating}, 0)`, filters.minRating),
    );
  }
  if (filters.minPrice !== undefined) {
    conditions.push(gte(effectivePriceSql, filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(sql`${effectivePriceSql} <= ${filters.maxPrice}`);
  }
  if (filters.search?.trim()) {
    const pattern = `%${filters.search.trim()}%`;
    const searchCondition = or(
      ilike(serviceListings.title, pattern),
      ilike(serviceListings.description, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const where = and(...conditions);

  const orderBy: ReturnType<typeof asc>[] = (() => {
    switch (sort) {
      case "price-asc":
        return [asc(effectivePriceSql)];
      case "price-desc":
        return [desc(effectivePriceSql)];
      case "rating":
        return [desc(sql`coalesce(${ratingAgg.avgRating}, 0)`)];
      default:
        return [
          desc(sql`coalesce(${ratingAgg.avgRating}, 0)`),
          desc(serviceListings.createdAt),
        ];
    }
  })();

  const rows = await db
    .select({
      id: serviceListings.id,
      title: serviceListings.title,
      description: serviceListings.description,
      pricingType: serviceListings.pricingType,
      categoryId: serviceListings.categoryId,
      basePrice: serviceListings.basePrice,
      location: serviceListings.location,
      estimatedDuration: serviceListings.estimatedDuration,
      tags: serviceListings.tags,
      categoryName: categories.name,
      categorySlug: categories.slug,
      providerId: user.id,
      providerName: user.name,
      providerImage: user.image,
      minTierPrice: tierMin.minTierPrice,
      hasTiers: tierMin.hasTiers,
      avgRating: ratingAgg.avgRating,
      reviewCount: sql<number>`coalesce(${ratingAgg.reviewCount}, 0)::int`,
      hasImage:
        sql<boolean>`exists (select 1 from listing_images li where li.listing_id = ${serviceListings.id}) or ${categories.imageData} is not null`.as(
          "has_image",
        ),
    })
    .from(serviceListings)
    .innerJoin(user, eq(serviceListings.providerId, user.id))
    .leftJoin(categories, eq(serviceListings.categoryId, categories.id))
    .leftJoin(ratingAgg, eq(ratingAgg.listingId, serviceListings.id))
    .leftJoin(tierMin, eq(tierMin.listingId, serviceListings.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // Count needs the same joins referenced by the WHERE clause.
  const [totalRow] = await db
    .select({ value: count() })
    .from(serviceListings)
    .innerJoin(categories, eq(serviceListings.categoryId, categories.id))
    .leftJoin(ratingAgg, eq(ratingAgg.listingId, serviceListings.id))
    .leftJoin(tierMin, eq(tierMin.listingId, serviceListings.id))
    .where(where);

  return {
    items: rows.map((row) => rowToCard(row as unknown as ListingRow)),
    total: totalRow?.value ?? 0,
  };
}

// --- Detail page ---------------------------------------------------------

export interface ListingImageSummary {
  id: string;
  altText: string | null;
}

export interface ListingReviewSummary {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: Date;
}

export interface ListingDetail {
  card: ServiceListingCard;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  tiers: TierOption[];
  images: ListingImageSummary[];
  providerBio: string | null;
  reviews: ListingReviewSummary[];
}

/** Single listing for the detail page; null when missing or invalid id. */
export async function getListingDetail(
  id: string,
): Promise<ListingDetail | null> {
  try {
    const [row] = await db
      .select({
        card: serviceListings,
        status: serviceListings.status,
        createdAt: serviceListings.createdAt,
        updatedAt: serviceListings.updatedAt,
        providerName: user.name,
        providerImage: user.image,
        categoryName: categories.name,
        categorySlug: categories.slug,
        minTierPrice: tierMin.minTierPrice,
        avgRating: ratingAgg.avgRating,
        reviewCount: sql<number>`coalesce(${ratingAgg.reviewCount}, 0)::int`,
        providerBio: sql<
          string | null
        >`(select pp.bio from provider_profiles pp where pp.user_id = ${user.id})`,
      })
      .from(serviceListings)
      .innerJoin(user, eq(serviceListings.providerId, user.id))
      .leftJoin(categories, eq(serviceListings.categoryId, categories.id))
      .leftJoin(ratingAgg, eq(ratingAgg.listingId, serviceListings.id))
      .leftJoin(tierMin, eq(tierMin.listingId, serviceListings.id))
      .where(eq(serviceListings.id, id));

    if (!row) return null;

    const [tiers, images, reviewRows] = await Promise.all([
      db
        .select({
          id: serviceTiers.id,
          name: serviceTiers.name,
          description: serviceTiers.description,
          priceCents: serviceTiers.price,
        })
        .from(serviceTiers)
        .where(eq(serviceTiers.listingId, id))
        .orderBy(asc(serviceTiers.displayOrder)),
      db
        .select({
          id: listingImages.id,
          altText: listingImages.altText,
        })
        .from(listingImages)
        .where(eq(listingImages.listingId, id))
        .orderBy(asc(listingImages.displayOrder), asc(listingImages.createdAt)),
      db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          reviewerName: user.name,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .innerJoin(user, eq(reviews.reviewerId, user.id))
        .where(and(eq(reviews.listingId, id), eq(reviews.isVisible, true)))
        .orderBy(desc(reviews.createdAt))
        .limit(10),
    ]);

    const base = row.card;
    const card: ServiceListingCard = {
      ...base,
      tags: Array.isArray(base.tags) ? base.tags : [],
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      provider: {
        id: base.providerId,
        name: row.providerName,
        image: row.providerImage,
      },
      startingPriceCents:
        row.minTierPrice !== null && row.minTierPrice < base.basePrice
          ? row.minTierPrice
          : base.basePrice,
      ratingAvg:
        row.avgRating === null ? null : Math.round(row.avgRating * 10) / 10,
      ratingCount: row.reviewCount,
      hasTiers: tiers.length > 0,
      hasImage: images.length > 0,
    };

    return {
      card,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tiers,
      images,
      providerBio: row.providerBio,
      reviews: reviewRows,
    };
  } catch {
    // Non-uuid ids (or transient DB errors) simply mean "not found".
    return null;
  }
}
