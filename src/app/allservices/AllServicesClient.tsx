"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import type { CategoryOption } from "@/lib/db/queries/categories";
import type { ServiceListingCard } from "@/types/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ListingCard } from "@/components/ListingCard";
import ListingRow from "@/components/ListingRow";
import {
  PAGE_SIZE,
  parseBrowseParams,
  browseStateToQuery,
  type BrowseState,
} from "@/lib/browse-params";

export type SortKey = "recommended" | "price-asc" | "price-desc" | "rating";

const PRICE_CEILING = 500;

interface AllServicesClientProps {
  categories: CategoryOption[];
}

export function AllServicesClient({ categories }: AllServicesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q")?.trim() ?? "");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [results, setResults] = useState<{
    items: ServiceListingCard[];
    total: number;
  } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isInternalNavigationRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive filter state from the current URL (source of truth)
  const state: BrowseState & { page: number } = parseBrowseParams(searchParams);

  // Sync local query state with URL when it changes externally (back/forward, clearFilters)
  useEffect(() => {
    if (isInternalNavigationRef.current) {
      isInternalNavigationRef.current = false;
      return;
    }
    setQuery(state.q);
  }, [state.q]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    };
  }, []);

  // Debounce the URL-driven fetch so rapid filter changes coalesce.
  const queryString = browseStateToQuery(state).toString();
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced fetch effect: runs whenever the query string changes.
  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Show loading immediately before the async fetch starts
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetching(true);
    fetchTimeoutRef.current = setTimeout(() => {
      fetch(`/api/listings${queryString ? `?${queryString}` : ""}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          setResults({ items: data.items ?? [], total: data.total ?? 0 });
          setFetchError(null);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error(err);
            setFetchError("Failed to load services. Please try again.");
          }
        })
        .finally(() => {
          setFetching(false);
        });
    }, 200);
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      controller.abort();
    };
  }, [queryString]);

  const pageCount = Math.max(1, Math.ceil((results?.total ?? 0) / PAGE_SIZE));
  const safePage = Math.min(state.page, pageCount);

  const hasActiveFilters =
    Boolean(state.q) ||
    state.cats.length > 0 ||
    state.minDollars !== null ||
    (state.maxDollars !== null && state.maxDollars < PRICE_CEILING) ||
    state.minRating > 0 ||
    state.verifiedOnly;

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
    isInternalNavigationRef.current = true;
    startTransition(() => {
      router.push(params.size ? `${pathname}?${params}` : pathname);
    });
  }

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

  function handleSearchChange(value: string) {
    setQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      isInternalNavigationRef.current = true;
      const q = value.trim();
      updateParams({ q: q || null });
    }, 300);
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    isInternalNavigationRef.current = true;
    const q = query.trim();
    updateParams({ q: q || null });
  }

  function handlePriceChange(type: "min" | "max", value: string) {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => {
      updateParams({ [type]: value === "" ? null : value });
    }, 300);
  }

  function toggleCategory(slug: string) {
    const next = state.cats.includes(slug)
      ? state.cats.filter((c) => c !== slug)
      : [...state.cats, slug];
    updateParams({ cats: next.join(",") || null });
  }

  const visibleCategories = showAllCategories
    ? categories
    : categories.slice(0, 6);
  const hasMoreCategories = categories.length > 6;

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
        {hasMoreCategories && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2.5 w-full justify-start gap-1.5 px-0"
            onClick={() => setShowAllCategories((prev) => !prev)}
          >
            {showAllCategories
              ? "Show fewer categories"
              : `Show all ${categories.length} categories`}
            <ChevronRight className="size-3.5" />
          </Button>
        )}
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
                onChange={(event) =>
                  handlePriceChange("min", event.target.value)
                }
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
                onChange={(event) =>
                  handlePriceChange("max", event.target.value)
                }
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
                  rating: state.minRating === rating ? null : String(rating),
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

  const listings = results?.items ?? [];
  const total = results?.total ?? 0;
  const showSkeleton = results === null && fetching;
  const showUpdating = results !== null && fetching;

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
              onSubmit={handleSearchSubmit}
            >
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search for a specific service..."
                className="h-10 rounded-lg pl-10"
              />
              <button
                type="submit"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Search"
              >
                <Search className="size-4" />
              </button>
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
                onChange={(event) => updateParams({ sort: event.target.value })}
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

          {showUpdating && (
            <p
              className="mb-3 text-sm text-muted-foreground"
              aria-live="polite"
            >
              Updating results…
            </p>
          )}

          {showSkeleton ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-xl border bg-card"
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
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

          {fetchError && (
            <p className="mt-3 text-sm text-destructive">{fetchError}</p>
          )}

          {/* Pagination */}
          {pageCount > 1 && results && (
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
