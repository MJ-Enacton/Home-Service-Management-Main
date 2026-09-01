"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarX2,
  Check,
  Hash,
  Inbox,
  MapPin,
  Play,
  Star,
  User,
  X,
} from "lucide-react";

import type { BookingListItem, BookingStatus, Role } from "@/types";
import { BOOKING_STATUS_LABELS } from "@/types";
import { formatCents, formatTimeDisplay } from "@/lib/format";
import { getSocket } from "@/lib/socket/client";
import {
  cancelMyBooking,
  completeJob,
  respondToBookingRequest,
  startJob,
  submitReview,
} from "./actions";
import { BackButton } from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const date = new Date(booking.scheduledDate);
  return `${date.toLocaleDateString("en-IN", { dateStyle: "medium" })} · ${formatTimeDisplay(booking.scheduledTimeSlot)}`;
}

interface MyBookingsClientProps {
  role: Role;
  bookings: BookingListItem[];
}

export function MyBookingsClient({ role, bookings }: MyBookingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [reviewing, setReviewing] = useState<BookingListItem | null>(null);

  const isCustomer = role !== "provider";

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

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.add({ title: result.error ?? "Action failed.", type: "error" });
      }
    });
  }

  const serviceTitles = useMemo(
    () => [...new Set(bookings.map((booking) => booking.listingTitle))].sort(),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    let result = bookings;

    if (isCustomer && serviceFilter !== "all") {
      result = result.filter(
        (booking) => booking.listingTitle === serviceFilter,
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((booking) => booking.status === statusFilter);
    }

    if (dateFilter) {
      result = result.filter(
        (booking) =>
          new Date(booking.scheduledDate).toDateString() ===
          new Date(dateFilter).toDateString(),
      );
    }

    return result.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
  }, [bookings, serviceFilter, statusFilter, dateFilter, isCustomer]);

  const hasActiveFilters =
    Boolean(dateFilter) ||
    statusFilter !== "all" ||
    (isCustomer && serviceFilter !== "all");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <div className="mb-8 border-b bg-muted/40 -mx-4 px-4 py-8 md:-mx-6 md:px-6">
        <BackButton className="mb-4" />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Account <span className="mx-1 text-border">/</span>{" "}
            <span className="font-medium text-foreground">My Bookings</span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Booking Dashboard
          </h1>
          <p className="text-muted-foreground">
            {isCustomer
              ? "Manage your scheduled appointments and track your service history."
              : "Track your booked jobs from request to completion."}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-8 flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        {isCustomer && (
          <div className="flex w-full sm:max-w-xs flex-col gap-1.5">
            <Label htmlFor="service-filter">Service</Label>
            <Select
              value={serviceFilter}
              onValueChange={(value) => setServiceFilter(value ?? "all")}
            >
              <SelectTrigger id="service-filter" className="w-full bg-background">
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
            <SelectTrigger id="status-filter" className="w-full bg-background">
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
        <Card className="overflow-hidden border-dashed bg-muted/40">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Inbox className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">No bookings found</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {bookings.length === 0
                  ? isCustomer
                    ? "You have no bookings yet. Browse services to make your first booking."
                    : "No jobs have been booked with you yet."
                  : "Try adjusting or clearing your filters."}
              </p>
            </div>
            {isCustomer && bookings.length === 0 && (
              <Link href="/allservices" className="mt-2">
                <Button>Browse Services</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card
              key={booking.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{booking.listingTitle}</h3>
                    {booking.categoryName && (
                      <p className="text-xs text-muted-foreground">
                        {booking.categoryName}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`capitalize ${STATUS_CLASS[booking.status]}`}
                  >
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </div>

                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <span className="flex items-center gap-2">
                    <Hash className="size-4 shrink-0" />
                    <span className="font-mono font-medium text-foreground">
                      {booking.bookingNumber}
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    <User className="size-4 shrink-0" />
                    {isCustomer ? "Provider" : "Customer"}:{" "}
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
                    <span className="wrap-break-word">{booking.addressLine}</span>
                  </span>
                </div>

                {/* Lifecycle actions */}
                <BookingActions
                    isCustomer={isCustomer}
                    booking={booking}
                    disabled={isPending}
                    onRespond={(accept) =>
                      runAction(() =>
                        respondToBookingRequest(booking.id, accept),
                      )
                    }
                    onStart={() => runAction(() => startJob(booking.id))}
                    onComplete={() => runAction(() => completeJob(booking.id))}
                    onCancel={() => runAction(() => cancelMyBooking(booking.id))}
                    onReview={() => setReviewing(booking)}
                  />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
        <CancelButton onCancel={onCancel} disabled={disabled} />
      </div>
    );
  }
  if (booking.status === "completed" && !booking.reviewed) {
    return (
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button size="sm" variant="outline" onClick={onReview} disabled={disabled}>
          <Star className="size-4" />
          Leave a Review
        </Button>
      </div>
    );
  }
  return null;
}

function CancelButton({
  onCancel,
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

/* ------------------------------------------------------------------ */
/* Review dialog                                                      */
/* ------------------------------------------------------------------ */

function ReviewDialog({
  booking,
  onClose,
  onSubmit,
  pending,
}: {
  booking: BookingListItem | null;
  onClose: () => void;
  onSubmit: (rating: number, comment?: string) => void;
  pending: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function close() {
    setRating(0);
    setComment("");
    onClose();
  }

  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate this service</DialogTitle>
          <DialogDescription>
            {booking
              ? `${booking.listingTitle} · ${booking.bookingNumber}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`size-8 ${
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>

          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Share details about your experience (optional)"
            rows={3}
            maxLength={1000}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(rating, comment.trim() || undefined)}
            disabled={pending || rating === 0}
          >
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
