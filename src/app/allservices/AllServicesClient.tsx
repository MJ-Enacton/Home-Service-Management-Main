"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  List,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import type { CategoryOption } from "@/lib/db/queries/categories";
import type { ServiceListingCard } from "@/types/service";
import {
  enumLabel,
  formatCents,
  pricingUnitLabel,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ListingCard } from "@/components/ListingCard";

export type SortKey = "recommended" | "price-asc" | "price-desc" | "rating";

export interface BrowseState {
  q: string;
  cats: string[];
  minDollars: number | null;
  maxDollars: number | null;
  minRating: number;
  verifiedOnly: boolean;
  sort: SortKey;
  page: number;
}

const PRICE_CEILING = 500;

interface AllServicesClientProps {
  listings: ServiceListingCard[];
  total: number;
  categories: CategoryOption[];
  state: BrowseState;
}

export function AllServicesClient({
  listings,
  total,
  categories,
  state,
}: AllServicesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(state.q);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / 9));
  const safePage = Math.min(state.page, pageCount);

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (!("page" in patch)) params.delete("page");
    startTransition(() => {
      router.push(params.size ? `${pathname}?${params}` : pathname);
    });
  }

  const hasActiveFilters =
    Boolean(state.q) ||
    state.cats.length > 0 ||
    state.minDollars !== null ||
    (state.maxDollars !== null && state.maxDollars < PRICE_CEILING) ||
    state.minRating > 0 ||
    state.verifiedOnly;

  function clearFilters() {
    setQuery("");
    updateParams({
      q: null,
      cats: null,
      min: null,
      max: null,
      rating: null,
      verified: null,
      sort: null,
      page: null,
    });
  }

  function toggleCategory(slug: string) {
    const next = state.cats.includes(slug)
      ? state.cats.filter((c) => c !== slug)
      : [...state.cats, slug];
    updateParams({ cats: next.join(",") || null });
  }

  const visibleCategories = categories.slice(0, 6);
  const hasMoreCategories = categories.length > visibleCategories.length;

  const filterPanel = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold">Categories</h3>
        <ul className="mt-3 space-y-2.5">
          {visibleCategories.map((category) => (
            <li key={category.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <Checkbox
                  checked={state.cats.includes(category.slug)}
                  onCheckedChange={() => toggleCategory(category.slug)}
                />
                {category.name}
              </label>
            </li>
          ))}
        </ul>
        {(hasMoreCategories || state.cats.some(
          (slug) => !categories.slice(0, 6).some((c) => c.slug === slug),
        )) && <p className="mt-2.5 text-xs text-muted-foreground">
            Showing the first {visibleCategories.length} of {categories.length}{" "}
            categories
          </p>}
      </div>

      <div className="border-t" />

      {/* Price range */}
      <div>
        <h3 className="text-sm font-semibold">Price Range</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">MIN</p>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                max={PRICE_CEILING}
                value={state.minDollars ?? ""}
                placeholder="0"
                onChange={(event) => {
                  const value = event.target.value;
                  updateParams({ min: value === "" ? null : value });
                }}
                className="h-9 pl-7"
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">MAX</p>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                max={PRICE_CEILING}
                value={state.maxDollars ?? ""}
                placeholder={String(PRICE_CEILING)}
                onChange={(event) => {
                  const value = event.target.value;
                  updateParams({ max: value === "" ? null : value });
                }}
                className="h-9 pl-7"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t" />

      {/* Minimum rating */}
      <div>
        <h3 className="text-sm font-semibold">Minimum Rating</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() =>
                updateParams({
                  rating:
                    state.minRating === rating ? null : String(rating),
                })
              }
              className={`flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs transition-colors ${
                state.minRating === rating
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:border-primary/50"
              }`}
            >
              <Star
                className={`size-3.5 ${
                  state.minRating === rating ? "fill-primary text-primary" : ""
                }`}
              />
              {rating}+
            </button>
          ))}
        </div>
      </div>

      <div className="border-t" />

      {/* Verified only */}
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-primary/5 p-3.5">
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-4 text-primary" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Verified Only</span>
            <span className="block text-xs text-muted-foreground">
              Background checked
            </span>
          </span>
        </span>
        <Checkbox
          checked={state.verifiedOnly}
          onCheckedChange={(checked) =>
            updateParams({ verified: checked === true ? "1" : null })
          }
        />
      </label>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={clearFilters}
        >
          <X className="size-3.5" />
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 md:px-6">
      {/* Page header */}
      <section className="border-b bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span className="mx-1.5 text-border">/</span>
            <span className="font-medium text-foreground">Services</span>
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Find Professional Help
              </h1>
              <p className="mt-1.5 text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">{total}</span>{" "}
                verified services matching your search
              </p>
            </div>
            <form
              className="relative w-full sm:w-72"
              onSubmit={(event) => {
                event.preventDefault();
                updateParams({ q: query.trim() || null });
              }}
            >
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for a specific service..."
                className="h-10 rounded-lg pl-10"
              />
            </form>
          </div>
        </div>
      </section>

      {/* Mobile filter toggle */}
      <div className="mt-4 flex items-center justify-between lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((prev) => !prev)}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {hasActiveFilters && (
            <span className="size-2 rounded-full bg-primary" />
          )}
        </Button>
      </div>
      {filtersOpen && (
        <div className="mt-4 rounded-xl border bg-card p-5 lg:hidden">
          {filterPanel}
        </div>
      )}

      <div className="flex gap-8 pt-6 pb-16">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          {/* Toolbar */}
          <div className="mb-5 flex items-center justify-between rounded-xl border bg-card px-4 py-2.5">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Sort by:
              </span>
              <select
                value={state.sort}
                onChange={(event) =>
                  updateParams({ sort: event.target.value })
                }
                className="cursor-pointer rounded-md bg-transparent py-1 pr-6 font-medium outline-none"
              >
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </label>

            <div className="flex items-center gap-1">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label="Grid view"
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label="List view"
                onClick={() => setView("list")}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>

          {isPending && (
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              Updating results…
            </p>
          )}

          {listings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
              <Search className="size-8 text-muted-foreground" />
              <p className="font-medium">No services found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pageCount > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 1}
                onClick={() => updateParams({ page: String(safePage - 1) })}
              >
                <ChevronLeft className="size-3.5" />
                Previous
              </Button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === safePage ? "default" : "outline"}
                    size="icon-sm"
                    onClick={() => updateParams({ page: String(pageNumber) })}
                    aria-label={`Page ${pageNumber}`}
                  >
                    {pageNumber}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === pageCount}
                onClick={() => updateParams({ page: String(safePage + 1) })}
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* List-view row                                                      */
/* ------------------------------------------------------------------ */

function ListingRow({ listing }: { listing: ServiceListingCard }) {
  return (
    <Link
      href={`/services/${listing.id}`}
      className="group flex gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative w-40 shrink-0 overflow-hidden rounded-lg sm:w-52">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/services/${listing.id}/image`}
          alt={listing.title}
          className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] sm:h-full"
          loading="lazy"
        />
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
                  <BadgeCheck className="size-3.5" />
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
