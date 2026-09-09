/**
 * Shared browse-state parsing/serialization for the services catalog.
 *
 * Single source of truth for the URL shape used by:
 *   - the server page (`/allservices/page.tsx`)
 *   - the client (`/allservices/AllServicesClient.tsx`)
 *   - the client-side data endpoint (`/api/listings/route.ts`)
 *
 * URL contract (all optional except `sort`/`page` defaults):
 *   q        free-text search string
 *   cats      comma-separated category slugs, e.g. "plumbing,electrical"
 *   min,max   price range in whole dollars (inclusive)
 *   rating    1-5 minimum average rating (0/absent = none)
 *   sort      recommended | price-asc | price-desc | rating
 *   page      1-based page index
 */

/** Number of listings per page (cards per grid). */
export const PAGE_SIZE = 12;

export type SortKey = "recommended" | "price-asc" | "price-desc" | "rating";

export const SORTS: SortKey[] = [
  "recommended",
  "price-asc",
  "price-desc",
  "rating",
];

export interface BrowseState {
  q: string;
  cats: string[];
  minDollars: number | null;
  maxDollars: number | null;
  minRating: number;
  sort: SortKey;
}

/** Raw search-param record (server `searchParams` shape). */
export interface RawSearchParams {
  q?: string;
  cats?: string;
  min?: string;
  max?: string;
  rating?: string;
  sort?: string;
  page?: string;
}

/** Read a single param from either a URLSearchParams or a plain record. */
function getParam(
  sp: URLSearchParams | RawSearchParams,
  key: string,
): string | null {
  if (typeof (sp as URLSearchParams).get === "function") {
    return (sp as URLSearchParams).get(key);
  }
  return (sp as RawSearchParams)[key as keyof RawSearchParams] ?? null;
}

/**
 * Parse URL params into a normalized BrowseState (+page).
 * Accepts a URLSearchParams (client) or a plain record (server searchParams).
 */
export function parseBrowseParams(
  sp: URLSearchParams | RawSearchParams,
): BrowseState & { page: number } {
  const sortParam = getParam(sp, "sort");
  const sort: SortKey = SORTS.includes(sortParam as SortKey)
    ? (sortParam as SortKey)
    : "recommended";

  const catsParam = getParam(sp, "cats");
  const minParam = getParam(sp, "min");
  const maxParam = getParam(sp, "max");
  const ratingParam = getParam(sp, "rating");
  const pageParam = getParam(sp, "page");

  return {
    q: getParam(sp, "q")?.trim() ?? "",
    cats: catsParam ? catsParam.split(",").filter(Boolean) : [],
    minDollars: minParam !== null && minParam !== "" ? Number(minParam) : null,
    maxDollars: maxParam !== null && maxParam !== "" ? Number(maxParam) : null,
    minRating: ratingParam ? Number(ratingParam) : 0,
    sort,
    page: Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1),
  };
}

/** Serialize BrowseState back into a URLSearchParams string for the API call. */
export function browseStateToQuery(
  state: BrowseState & { page?: number },
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.cats.length) params.set("cats", state.cats.join(","));
  if (state.minDollars !== null) params.set("min", String(state.minDollars));
  if (state.maxDollars !== null) params.set("max", String(state.maxDollars));
  if (state.minRating > 0) params.set("rating", String(state.minRating));
  params.set("sort", state.sort);
  params.set("page", String(state.page ?? 1));
  return params;
}
