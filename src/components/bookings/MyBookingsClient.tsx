"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarX2,
  Check,
  ChevronLeft,
  ChevronRight,
  Hash,
  Inbox,
  MapPin,
  Play,
  Search,
  Star,
  User,
  X,
} from "lucide-react";

import type { BookingListItem, BookingStatus, Role } from "@/types";
import { BOOKING_STATUS_LABELS } from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatBookingSchedule, formatCents } from "@/lib/format";
import { getSocket } from "@/lib/socket/client";
import {
  cancelMyBooking,
  completeJob,
  respondToBookingRequest,
  startJob,
  submitReview,
} from "@/lib/bookings/actions";
import {
  retryBookingPayment,
  verifyBookingPayment,
} from "@/app/services/[id]/actions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { BackButton } from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewDialog } from "@/components/reviews/ReviewDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

const STATUS_CLASS: Record<BookingStatus, string> = {
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

function formatScheduled(booking: BookingListItem): string {
  return formatBookingSchedule(
    booking.scheduledDate,
    booking.scheduledTimeSlot,
  );
}

interface MyBookingsClientProps {
  role: Role;
  bookings: BookingListItem[];
  /** Bookings where this provider acted as customer (provider-hat page only). */
  customerBookings?: BookingListItem[];
  initialReviewBookingId?: string | null;
}

type ProviderHat = "received" | "mine";

const BOOKINGS_PAGE_SIZE = 6;

export function MyBookingsClient({
  role,
  bookings,
  customerBookings = [],
  initialReviewBookingId = null,
}: MyBookingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [page, setPage] = useState(1);
  const isProvider = role === "provider";

  // Provider tabs — default to "mine" when ?review= points to a customer-hat booking.
  const [activeHat, setActiveHat] = useState<ProviderHat>(() => {
    if (!isProvider || !initialReviewBookingId) return "received";
    return customerBookings.some((b) => b.id === initialReviewBookingId)
      ? "mine"
      : "received";
  });

  // Active list + role view for this tab (mine acts as customer).
  const activeBookings = isProvider
    ? activeHat === "mine"
      ? customerBookings
      : bookings
    : bookings;
  const isCustomerView = !isProvider || activeHat === "mine";
  const bookingsHref = isProvider
    ? "/provider/my-bookings"
    : "/customer/my-bookings";

  // Deep-link from notifications: ?review=<bookingId> opens the dialog on first render.
  const [reviewing, setReviewing] = useState<BookingListItem | null>(() => {
    if (!initialReviewBookingId) return null;
    const searchPool = isProvider ? customerBookings : bookings;
    const target = searchPool.find((b) => b.id === initialReviewBookingId);
    return target && target.status === "completed" && !target.reviewed
      ? target
      : null;
  });

  // Listen for real-time booking updates via Socket.IO.
  useEffect(() => {
    const socket = getSocket();
    function handleBookingUpdate() {
      router.refresh();
    }
    socket.on("booking:updated", handleBookingUpdate);
    return () => {
      socket.off("booking:updated", handleBookingUpdate);
    };
  }, [router]);

  // Toast + URL cleanup for the ?review= deep-link (no state writes here).
  useEffect(() => {
    if (!initialReviewBookingId) return;
    const searchPool = isProvider ? customerBookings : bookings;
    const target = searchPool.find((b) => b.id === initialReviewBookingId);
    if (target && (target.status !== "completed" || target.reviewed)) {
      toast.add({
        title: target.reviewed
          ? "You already reviewed this booking."
          : "This booking can't be reviewed yet.",
        type: "error",
      });
    }
    if (target || !searchPool.some((b) => b.id === initialReviewBookingId)) {
      router.replace(bookingsHref, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReviewBookingId, isProvider]);

  function runAction(
    action: () => Promise<{ success: boolean; error?: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.add({ title: result.error ?? "Action failed.", type: "error" });
      }
    });
  }

  const serviceTitles = useMemo(
    () =>
      [
        ...new Set(activeBookings.map((booking) => booking.listingTitle)),
      ].sort(),
    [activeBookings],
  );

  const filteredBookings = useMemo(() => {
    let result = activeBookings;

    const query = debouncedSearch.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (booking) =>
          booking.listingTitle.toLowerCase().includes(query) ||
          booking.bookingNumber.toLowerCase().includes(query) ||
          booking.counterpartyName.toLowerCase().includes(query) ||
          (booking.categoryName?.toLowerCase().includes(query) ?? false),
      );
    }

    if (isCustomerView && serviceFilter !== "all") {
      result = result.filter(
        (booking) => booking.listingTitle === serviceFilter,
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((booking) => booking.status === statusFilter);
    }

    if (dateFilter) {
      // Both sides are "YYYY-MM-DD" (date input value vs date column).
      result = result.filter(
        (booking) => booking.scheduledDate === dateFilter,
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
  }, [
    activeBookings,
    debouncedSearch,
    serviceFilter,
    statusFilter,
    dateFilter,
    isCustomerView,
  ]);

  // Reset to first page whenever the list or filters change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- page resets when filters change
    setPage(1);
  }, [
    activeHat,
    debouncedSearch,
    serviceFilter,
    statusFilter,
    dateFilter,
    activeBookings.length,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredBookings.length / BOOKINGS_PAGE_SIZE),
  );
  const safePage = Math.min(page, pageCount);
  const pagedBookings = filteredBookings.slice(
    (safePage - 1) * BOOKINGS_PAGE_SIZE,
    safePage * BOOKINGS_PAGE_SIZE,
  );
  const rangeStart =
    filteredBookings.length === 0
      ? 0
      : (safePage - 1) * BOOKINGS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safePage * BOOKINGS_PAGE_SIZE,
    filteredBookings.length,
  );

  // Compact page numbers: 1 … window … last (max 7 buttons).
  const pageNumbers = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const window = new Set([1, 2, pageCount - 1, pageCount, safePage - 1, safePage, safePage + 1]);
    return [...window]
      .filter((n) => n >= 1 && n <= pageCount)
      .sort((a, b) => a - b);
  }, [pageCount, safePage]);

  const hasActiveFilters =
    Boolean(dateFilter) ||
    Boolean(debouncedSearch.trim()) ||
    statusFilter !== "all" ||
    (isCustomerView && serviceFilter !== "all");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 md:px-6 md:pt-8">
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4 sm:px-6">
          <BackButton
            className="mb-3 -ml-1"
            href={isProvider ? "/provider/dashboard" : "/services"}
          />
          <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {!isProvider
              ? "Your appointments — confirmed, upcoming and past."
              : activeHat === "mine"
                ? "Services you booked as a customer."
                : "Incoming requests and scheduled jobs — confirm or start work."}
          </p>
        </div>
        <div className="p-3 sm:p-4">
          {/* Provider hats: received vs my bookings */}
          {isProvider && (
            <div className="mb-4 inline-flex rounded-full border bg-white p-1 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setActiveHat("received")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeHat === "received" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Jobs received ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveHat("mine")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeHat === "mine" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                My bookings ({customerBookings.length})
              </button>
            </div>
          )}

          {/* Filter bar — creamish like notifications */}
          <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-white p-3 dark:bg-zinc-800/60 sm:flex-row sm:items-end">
            <div className="flex w-full sm:max-w-xs flex-col gap-1.5">
              <Label htmlFor="booking-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="booking-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Service, booking #, name..."
                  className="bg-background pl-9"
                />
              </div>
            </div>
            {isCustomerView && (
              <div className="flex w-full sm:max-w-xs flex-col gap-1.5">
                <Label htmlFor="service-filter">Service</Label>
                <Select
                  value={serviceFilter}
                  onValueChange={(value) => setServiceFilter(value ?? "all")}
                >
                  <SelectTrigger
                    id="service-filter"
                    className="w-full bg-background"
                  >
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All services</SelectItem>
                    {serviceTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex w-full sm:max-w-xs flex-col gap-1.5">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value ?? "all")}
              >
                <SelectTrigger
                  id="status-filter"
                  className="w-full bg-background"
                >
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  {(Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {BOOKING_STATUS_LABELS[status]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full sm:max-w-xs flex-col gap-1.5">
              <Label htmlFor="date-filter">Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="bg-background"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="sm:mb-0.5"
                onClick={() => {
                  setDateFilter("");
                  setSearchInput("");
                  setServiceFilter("all");
                  setStatusFilter("all");
                }}
              >
                <CalendarX2 className="size-3.5" />
                Clear filters
              </Button>
            )}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-cream py-16 text-center dark:bg-zinc-800/60">
              <div className="mx-auto flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Inbox className="size-8 text-primary" />
                </div>
              </div>
              <p className="mt-4 text-lg font-semibold">No bookings found</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {activeBookings.length === 0
                  ? isCustomerView
                    ? "You have no bookings yet. Browse services to make your first booking."
                    : "No jobs have been booked with you yet."
                  : "Try adjusting or clearing your filters."}
              </p>
              {isCustomerView && activeBookings.length === 0 && (
                <Link href="/services" className="mt-4 inline-block">
                  <Button>Browse Services</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filteredBookings.length}{" "}
                booking{filteredBookings.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-3">
                {pagedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border bg-cream p-3 transition hover:border-zinc-300 sm:p-4 dark:bg-zinc-800/60 dark:border-zinc-700 dark:hover:border-zinc-600"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold sm:text-base">
                          {booking.listingTitle}
                        </h3>
                        {booking.categoryName && (
                          <p className="text-xs text-muted-foreground max-sm:hidden">
                            {booking.categoryName}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`capitalize max-sm:px-2 max-sm:py-0.5 max-sm:text-[11px] ${STATUS_CLASS[booking.status]}`}
                      >
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </Badge>
                    </div>

                    {/* Mobile-only compact summary */}
                    <div className="flex flex-col gap-2.5 text-sm sm:hidden">
                      <p className="text-xs text-muted-foreground">
                        {booking.categoryName && (
                          <span>{booking.categoryName} · </span>
                        )}
                        <span className="font-mono font-medium text-foreground/80">
                          #{booking.bookingNumber}
                        </span>
                      </p>

                      <div className="flex items-center gap-2 text-foreground">
                        <CalendarDays className="size-4 shrink-0 text-primary" />
                        <span className="font-medium">
                          {formatScheduled(booking)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="size-4 shrink-0" />
                        <span className="truncate">
                          {isCustomerView ? "Provider" : "Customer"}:{" "}
                          <span className="font-medium text-foreground">
                            {booking.counterpartyName || "Not assigned yet"}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
                        <span className="font-semibold text-foreground">
                          {formatCents(booking.totalAmountCents)}
                        </span>
                        {booking.amountPaidCents !== null && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            {formatCents(booking.amountPaidCents)} paid
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{booking.addressLine}</span>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground max-sm:hidden sm:grid-cols-2">
                      <span className="flex items-center gap-2">
                        <Hash className="size-4 shrink-0" />
                        <span className="font-mono font-medium text-foreground">
                          {booking.bookingNumber}
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        <User className="size-4 shrink-0" />
                        {isCustomerView ? "Provider" : "Customer"}:{" "}
                        <span className="font-medium text-foreground">
                          {booking.counterpartyName || "Not assigned yet"}
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        <CalendarDays className="size-4 shrink-0" />
                        {formatScheduled(booking)}
                      </span>

                      <span className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {formatCents(booking.totalAmountCents)}
                        </span>
                        total
                        {booking.amountPaidCents !== null && (
                          <span className="text-green-600 dark:text-green-400">
                            · {formatCents(booking.amountPaidCents)} paid
                          </span>
                        )}
                      </span>

                      <span className="flex items-start gap-2 sm:col-span-2">
                        <MapPin className="mt-0.5 size-4 shrink-0" />
                        <span className="wrap-break-word">
                          {booking.addressLine}
                        </span>
                      </span>
                    </div>

                    {/* Lifecycle actions */}
                    <BookingActions
                      isCustomer={isCustomerView}
                      booking={booking}
                      disabled={isPending}
                      onRespond={(accept) =>
                        runAction(() =>
                          respondToBookingRequest(booking.id, accept),
                        )
                      }
                      onStart={() => runAction(() => startJob(booking.id))}
                      onComplete={() =>
                        runAction(() => completeJob(booking.id))
                      }
                      onCancel={() =>
                        runAction(() => cancelMyBooking(booking.id))
                      }
                      onReview={() => setReviewing(booking)}
                    />
                  </div>
                </div>
                ))}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <nav
                  className="mt-6 flex items-center justify-center gap-1"
                  aria-label="Bookings pages"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage === 1}
                    onClick={() => setPage(safePage - 1)}
                  >
                    <ChevronLeft className="size-3.5" />
                    Previous
                  </Button>
                  {pageNumbers.map((pageNum, idx) => (
                    <span key={pageNum} className="flex items-center gap-1">
                      {idx > 0 && pageNum - pageNumbers[idx - 1]! > 1 && (
                        <span className="px-1 text-xs text-muted-foreground">
                          …
                        </span>
                      )}
                      <Button
                        variant={pageNum === safePage ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => setPage(pageNum)}
                        aria-label={`Page ${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    </span>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage === pageCount}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Next
                    <ChevronRight className="size-3.5" />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Review dialog */}
      <ReviewDialog
        booking={reviewing}
        onClose={() => setReviewing(null)}
        onSubmit={(rating, comment) =>
          startTransition(async () => {
            const result = await submitReview({
              bookingId: reviewing!.id,
              rating,
              comment,
            });
            if (!result.success) {
              toast.add({ title: result.error, type: "error" });
              return;
            }
            toast.add({ title: "Thanks for your review!", type: "success" });
            setReviewing(null);
          })
        }
        pending={isPending}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Per-status action row                                              */
/* ------------------------------------------------------------------ */

function BookingActions({
  isCustomer,
  booking,
  disabled,
  onRespond,
  onStart,
  onComplete,
  onCancel,
  onReview,
}: {
  isCustomer: boolean;
  booking: BookingListItem;
  disabled: boolean;
  onRespond: (accept: boolean) => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onReview: () => void;
}) {
  if (!isCustomer) {
    // Provider view
    if (booking.status === "requested") {
      return (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button size="sm" onClick={() => onRespond(true)} disabled={disabled}>
            <Check className="size-4" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRespond(false)}
            disabled={disabled}
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <X className="size-4" />
            Decline
          </Button>
        </div>
      );
    }
    if (booking.status === "confirmed") {
      return (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button size="sm" onClick={onStart} disabled={disabled}>
            <Play className="size-4" />
            Start Job
          </Button>
          <CancelButton onCancel={onCancel} disabled={disabled} />
        </div>
      );
    }
    if (booking.status === "in_progress") {
      return (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button size="sm" onClick={onComplete} disabled={disabled}>
            <Check className="size-4" />
            Mark Completed
          </Button>
        </div>
      );
    }
    return null;
  }

  // Customer view
  if (booking.status === "requested" || booking.status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-2 border-t pt-3">
        {booking.paymentPending ? <PayNowButton bookingId={booking.id} /> : null}
        <CancelButton onCancel={onCancel} disabled={disabled} />
      </div>
    );
  }
  if (booking.status === "completed" && !booking.reviewed) {
    return (
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={onReview}
          disabled={disabled}
        >
          <Star className="size-4" />
          Leave a Review
        </Button>
      </div>
    );
  }
  return null;
}

/** Pay-now retry for a pending online payment (Checkout + verify). */
function PayNowButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  async function handlePayNow() {
    if (paying) return;
    setPaying(true);
    try {
      const retry = await retryBookingPayment(bookingId);
      if (!retry.success) {
        toast.add({ title: retry.error, type: "error" });
        return;
      }
      if (!retry.payment) {
        toast.add({ title: "Could not start payment.", type: "error" });
        return;
      }
      await openRazorpayCheckout({
        keyId: retry.payment.keyId,
        orderId: retry.payment.orderId,
        amount: retry.payment.amount,
        onSuccess: async (creds) => {
          const verified = await verifyBookingPayment({
            bookingId,
            ...creds,
          });
          if (!verified.success) {
            toast.add({ title: verified.error, type: "error" });
            return;
          }
          toast.add({ title: "Payment successful!", type: "success" });
          router.refresh();
        },
        onDismiss: () => {},
      });
    } catch (err) {
      toast.add({
        title: err instanceof Error ? err.message : "Payment failed.",
        type: "error",
      });
    } finally {
      setPaying(false);
    }
  }

  return (
    <Button size="sm" onClick={handlePayNow} disabled={paying}>
      {paying ? "Opening payment…" : "Pay now"}
    </Button>
  );
}

function CancelButton({  onCancel,
  disabled,
}: {
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onCancel}
      disabled={disabled}
      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
    >
      <X className="size-4" />
      Cancel booking
    </Button>
  );
}
