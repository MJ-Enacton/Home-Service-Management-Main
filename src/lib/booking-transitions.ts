import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { bookings, notifications } from "@/lib/db/schema";
import type { BookingStatus } from "@/types";
import type { NotificationType } from "@/lib/notification-types";
import { emitToUser } from "@/lib/socket/emit";
import { pushUnreadCount } from "@/lib/socket/notify";

export interface TransitionResult {
  id: string;
  customerId: string;
  providerId: string;
  bookingNumber: string;
  status: BookingStatus;
}

/**
 * Atomic conditional updates — Postgres row-locks during the statement, so
 * concurrent clicks can't double-apply a transition; zero updated rows means
 * the preconditions (status/actor) no longer hold.
 */

/** Provider accepts a requested booking; rejects on schedule conflict. */
export async function confirmBooking(
  providerId: string,
  bookingId: string,
): Promise<TransitionResult | null> {
  const [updated] = await db
    .update(bookings)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.providerId, providerId),
        eq(bookings.status, "requested"),
        sql`not exists (
          select 1 from bookings other
          where other.provider_id = ${providerId}
            and other.scheduled_date = ${bookings.scheduledDate}
            and other.scheduled_time_slot = ${bookings.scheduledTimeSlot}
            and other.status not in ('cancelled', 'completed')
            and other.id <> ${bookingId}
        )`,
      ),
    )
    .returning({
      id: bookings.id,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
    });
  return updated ?? null;
}

/** Provider declines a request → cancelled. */
export async function declineBooking(
  providerId: string,
  bookingId: string,
): Promise<TransitionResult | null> {
  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.providerId, providerId),
        eq(bookings.status, "requested"),
      ),
    )
    .returning({
      id: bookings.id,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
    });
  return updated ?? null;
}

/** Provider starts work on a confirmed booking. */
export async function startBooking(
  providerId: string,
  bookingId: string,
): Promise<TransitionResult | null> {
  const [updated] = await db
    .update(bookings)
    .set({ status: "in_progress", startedAt: new Date() })
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.providerId, providerId),
        eq(bookings.status, "confirmed"),
      ),
    )
    .returning({
      id: bookings.id,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
    });
  return updated ?? null;
}

/** Provider marks an in-progress job completed. */
export async function completeBooking(
  providerId: string,
  bookingId: string,
): Promise<TransitionResult | null> {
  const [updated] = await db
    .update(bookings)
    .set({ status: "completed", completedAt: new Date() })
    .where(
      and(
        eq(bookings.id, bookingId),
        eq(bookings.providerId, providerId),
        eq(bookings.status, "in_progress"),
      ),
    )
    .returning({
      id: bookings.id,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
    });
  return updated ?? null;
}

/** Customer or provider cancels before work begins. */
export async function cancelBooking(
  userId: string,
  bookingId: string,
): Promise<TransitionResult | null> {
  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(
      and(
        eq(bookings.id, bookingId),
        sql`(${bookings.customerId} = ${userId} or ${bookings.providerId} = ${userId})`,
        sql`${bookings.status} in ('requested', 'confirmed')`,
        // Guard against the same row being cancelled concurrently.
        ne(bookings.status, "cancelled"),
      ),
    )
    .returning({
      id: bookings.id,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
    });
  return updated ?? null;
}

const STATUS_EVENT_LABELS: Record<string, string> = {
  confirmed: "Booking confirmed",
  cancelled: "Booking cancelled",
  in_progress: "Job started",
  completed: "Job completed",
};

/** Persist + push a notification about a booking transition to one party. */
export async function notifyBookingUpdate(options: {
  userId: string;
  actorName: string;
  result: TransitionResult;
}): Promise<void> {
  const label =
    options.result.status === "cancelled"
      ? `${STATUS_EVENT_LABELS.cancelled}`
      : (STATUS_EVENT_LABELS[options.result.status] ?? "Booking updated");
  const message = `Your booking ${options.result.bookingNumber}: ${label.toLowerCase()} by ${options.actorName}.`;

  const notificationId = crypto.randomUUID();
  await db.insert(notifications).values({
    id: notificationId,
    userId: options.userId,
    bookingId: options.result.id,
    type: notificationTypeFor(options.result.status),
    title: label,
    message,
  });

  emitToUser(options.userId, "booking:updated", {
    bookingId: options.result.id,
    bookingNumber: options.result.bookingNumber,
    status: options.result.status,
  });
  emitToUser(options.userId, "notification:new", {
    id: notificationId,
    bookingId: options.result.id,
    bookingNumber: options.result.bookingNumber,
    title: label,
    message,
    type: notificationTypeFor(options.result.status),
    createdAt: new Date().toISOString(),
  });
  void pushUnreadCount(options.userId);
}

function notificationTypeFor(status: BookingStatus): NotificationType {
  switch (status) {
    case "confirmed":
      return "request_accepted";
    case "in_progress":
      return "booking_started";
    case "completed":
      return "booking_completed";
    case "cancelled":
      return "booking_cancelled";
    default:
      return "system";
  }
}
