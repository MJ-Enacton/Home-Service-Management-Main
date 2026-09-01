import { NextResponse } from "next/server";

import { listListings } from "@/lib/db/queries/listings";
import { PAGE_SIZE, parseBrowseParams } from "@/lib/browse-params";

/**
 * Client-side listings data for the services catalog.
 *
 * The server page no longer re-queries on every filter change; instead the
 * browser calls this endpoint (debounced). The page shell + categories are
 * still SSR'd; only the listings grid is fetched client-side.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const state = parseBrowseParams(sp);

  const { items, total } = await listListings({
    filters: {
      categories: state.cats.length ? state.cats : undefined,
      minPrice:
        state.minDollars !== null && Number.isFinite(state.minDollars)
          ? Math.round(state.minDollars * 100)
          : undefined,
      maxPrice:
        state.maxDollars !== null && Number.isFinite(state.maxDollars)
          ? Math.round(state.maxDollars * 100)
          : undefined,
      minRating: state.minRating > 0 ? state.minRating : undefined,
      verifiedOnly: state.verifiedOnly || undefined,
      search: state.q || undefined,
    },
    sort: state.sort,
    page: state.page,
    pageSize: PAGE_SIZE,
  });

  return NextResponse.json(
    { items, total, page: state.page, pageSize: PAGE_SIZE },
    { headers: { "Cache-Control": "no-store" } },
  );
}