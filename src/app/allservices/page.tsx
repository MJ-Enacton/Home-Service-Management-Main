import { Suspense } from "react";
import {
  AllServicesClient,
  type BrowseState,
} from "./AllServicesClient";
import { listListings } from "@/lib/db/queries/listings";
import type { ListingSort } from "@/lib/db/queries/listings";
import { listCategories } from "@/lib/db/queries/categories";

export const PAGE_SIZE = 9;

const SORTS: ListingSort[] = [
  "recommended",
  "price-asc",
  "price-desc",
  "rating",
];

interface RawSearchParams {
  q?: string;
  cats?: string;
  min?: string;
  max?: string;
  rating?: string;
  verified?: string;
  sort?: string;
  page?: string;
}

export function parseBrowseParams(
  sp: RawSearchParams,
): BrowseState & { page: number } {
  const sort = SORTS.includes(sp.sort as ListingSort)
    ? (sp.sort as ListingSort)
    : "recommended";

  return {
    q: sp.q?.trim() ?? "",
    cats: sp.cats ? sp.cats.split(",").filter(Boolean) : [],
    minDollars: sp.min !== undefined && sp.min !== "" ? Number(sp.min) : null,
    maxDollars: sp.max !== undefined && sp.max !== "" ? Number(sp.max) : null,
    minRating: sp.rating ? Number(sp.rating) : 0,
    verifiedOnly: sp.verified === "1",
    sort,
    page: Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1),
  };
}

export default async function AllServicesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const state = parseBrowseParams(await searchParams);

  const [{ items, total }, categories] = await Promise.all([
    listListings({
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
    }),
    listCategories(),
  ]);

  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 py-24 md:px-6">
          <p className="text-center text-sm text-muted-foreground">
            Loading services…
          </p>
        </main>
      }
    >
      <AllServicesClient
        listings={items}
        total={total}
        categories={categories}
        state={state}
      />
    </Suspense>
  );
}
