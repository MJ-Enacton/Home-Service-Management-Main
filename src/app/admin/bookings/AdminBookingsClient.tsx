"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";

import type { AdminBookingRow } from "@/lib/db/queries/admin-bookings";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatBookingSchedule, formatCents } from "@/lib/format";
import { BackButton } from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  requested:
    "border-amber-400 bg-amber-100/50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400",
  confirmed:
    "border-blue-400 bg-blue-100/50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-400",
  in_progress:
    "border-violet-400 bg-violet-100/50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-400",
  completed:
    "border-green-400 bg-green-100/50 text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400",
  cancelled:
    "border-red-400 bg-red-100/50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatScheduled(booking: AdminBookingRow): string {
  return formatBookingSchedule(
    booking.scheduledDate,
    booking.scheduledTimeSlot,
  );
}

interface AdminBookingsClientProps {
  bookings: AdminBookingRow[];
  total: number;
  page: number;
  search: string;
  status: string;
}

export function AdminBookingsClient({
  bookings,
  total,
  page,
  search,
  status,
}: AdminBookingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState(search);
  const debouncedDraft = useDebouncedValue(draft, 300);

  // Sync local input when URL search changes externally (back/forward, clear).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- draft mirrors URL source of truth
    setDraft(search);
  }, [search]);

  // Push debounced search to URL — avoids a navigation per keystroke.
  useEffect(() => {
    const next = debouncedDraft.trim();
    if (next === search.trim()) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next) {
      params.set("search", next);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(params.size ? `?${params}` : "/admin/bookings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDraft]);

  const pageCount = Math.max(1, Math.ceil(total / 15));
  const startItem = total === 0 ? 0 : (page - 1) * 15 + 1;
  const endItem = Math.min(page * 15, total);

  // Compact page numbers: 1 … window … last (max 7 buttons).
  const pageWindow = (() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const window = new Set([1, 2, pageCount - 1, pageCount, page - 1, page, page + 1]);
    return [...window]
      .filter((n) => n >= 1 && n <= pageCount)
      .sort((a, b) => a - b);
  })();

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
    router.push(params.size ? `?${params}` : "/admin/bookings");
  }

  function clearFilters() {
    setDraft("");
    updateParams({ search: null, status: null, page: null });
  }

  const hasActiveFilters = Boolean(search) || Boolean(status);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 md:px-6 md:pt-8">
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4 sm:px-6">
          <BackButton className="mb-3 -ml-1" href="/admin" />
          <h1 className="text-2xl font-semibold tracking-tight">
            All Bookings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all platform bookings.
          </p>
        </div>

        <div className="p-3 sm:p-4">
          {/* Filter bar */}
          <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-white p-3 dark:bg-zinc-800/60 sm:flex-row sm:items-end">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search booking #, service, customer, provider..."
                className="h-9 rounded-full pl-9 pr-3 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={status}
                onValueChange={(value) =>
                  updateParams({ status: value || null, page: null })
                }
              >
                <SelectTrigger className="w-50 bg-white dark:bg-zinc-900">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-cream py-12 text-center dark:bg-zinc-800/60">
              <p className="text-sm font-medium">No bookings found</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                {total === 0
                  ? "No bookings exist on the platform yet."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">
                        Booking
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                        Customer → Provider
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        Schedule
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-xs text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">
                        Requested
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/services/${booking.id}`}
                            className="font-mono font-medium text-primary hover:underline"
                          >
                            #{booking.bookingNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium truncate max-w-xs">
                            {booking.listingTitle}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-sm font-medium truncate max-w-xs">
                            {booking.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            → {booking.providerName}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs text-muted-foreground">
                            {formatScheduled(booking)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCents(booking.totalAmountCents, {
                            withCents: false,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              STATUS_CLASS[booking.status],
                            )}
                          >
                            {STATUS_LABELS[booking.status] ?? booking.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(booking.requestedAt).toLocaleDateString(
                            "en-IN",
                            {
                              dateStyle: "short",
                            },
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <nav
                  className="mt-6 flex flex-col items-center gap-2"
                  aria-label="Bookings pages"
                >
                  <p className="text-xs text-muted-foreground">
                    Showing {startItem}–{endItem} of {total} bookings
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => updateParams({ page: String(page - 1) })}
                    >
                      <ChevronLeft className="size-3.5" />
                      Previous
                    </Button>
                    {pageWindow.map((pageNum, idx) => (
                      <span key={pageNum} className="flex items-center gap-1">
                        {idx > 0 && pageNum - pageWindow[idx - 1]! > 1 && (
                          <span className="px-1 text-xs text-muted-foreground">
                            …
                          </span>
                        )}
                        <Button
                          variant={pageNum === page ? "default" : "outline"}
                          size="icon-sm"
                          onClick={() =>
                            updateParams({ page: String(pageNum) })
                          }
                          aria-label={`Page ${pageNum}`}
                        >
                          {pageNum}
                        </Button>
                      </span>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === pageCount}
                      onClick={() => updateParams({ page: String(page + 1) })}
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </Card>
    </main>
  );
}
