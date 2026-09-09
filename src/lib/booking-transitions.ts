import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { bookings, notifications } from "@/lib/db/schema";
import type { BookingStatus } from "@/types";
import type { NotificationType } from "@/lib/notification-types";
import { emitToUser } from "@/lib/socket/emit";
import { pushUnreadCount } from "@/lib/socket/notify";

/** Transaction client type for helpers that run inside db.transaction. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface TransitionResult {
  id: string;
  customerId: string;
  providerId: string;
  bookingNumber: string;
  status: BookingStatus;
}

export interface TransitionOutcome extends TransitionResult {
  notificationId: string;
  notificationTitle: string;
  notificationMessage: string;
  notificationType: NotificationType;
}

/**
 * Atomic conditional updates — Postgres row-locks during the statement, so
 * concurrent clicks can't double-apply a transition; zero updated rows means
 * the preconditions (status/actor) no longer hold.
 *
 * Each transition also inserts its notification row in the SAME
 * transaction: a status change can never exist without its notification.
 */

const STATUS_EVENT_LABELS: Record<string, string> = {
  confirmed: "Booking confirmed",
  cancelled: "Booking cancelled",
  in_progress: "Job started",
  completed: "Job completed",
};

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

function buildNotification(
  result: TransitionResult,
  actorName: string,
): { title: string; message: string; type: NotificationType } {
  const label =
    result.status === "cancelled"
      ? `${STATUS_EVENT_LABELS.cancelled}`
      : (STATUS_EVENT_LABELS[result.status] ?? "Booking updated");
  return {
    title: label,
    message: `Your booking ${result.bookingNumber}: ${label.toLowerCase()} by ${actorName}.`,
    type: notificationTypeFor(result.status),
  };
}

/** Insert the notification for a transition inside the same tx. */
async function insertTransitionNotification(
  tx: Tx,
  result: TransitionResult,
  notifyUserId: string,
  actorName: string,
): Promise<TransitionOutcome> {
  const { title, message, type } = buildNotification(result, actorName);
  const notificationId = crypto.randomUUID();
  await tx.insert(notifications).values({
    id: notificationId,
    userId: notifyUserId,
    bookingId: result.id,
    type,
    title,
    message,
  });
  return {
    ...result,
    notificationId,
    notificationTitle: title,
    notificationMessage: message,
    notificationType: type,
  };
}

/** Provider accepts a requested booking; rejects on schedule conflict. */
export async function confirmBooking(
  providerId: string,
  bookingId: string,
  actorName: string,
): Promise<TransitionOutcome | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
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
    if (!updated) return null;
    return insertTransitionNotification(
      tx,
      updated,
      updated.customerId,
      actorName,
    );
  });
}

/** Provider declines a request → cancelled. */
export async function declineBooking(
  providerId: string,
  bookingId: string,
  actorName: string,
): Promise<TransitionOutcome | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
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
    if (!updated) return null;
    return insertTransitionNotification(
      tx,
      updated,
      updated.customerId,
      actorName,
    );
  });
}

/** Provider starts work on a confirmed booking. */
export async function startBooking(
  providerId: string,
  bookingId: string,
  actorName: string,
): Promise<TransitionOutcome | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
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
    if (!updated) return null;
    return insertTransitionNotification(
      tx,
      updated,
      updated.customerId,
      actorName,
    );
  });
}

/** Provider marks an in-progress job completed. */
export async function completeBooking(
  providerId: string,
  bookingId: string,
  actorName: string,
): Promise<TransitionOutcome | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
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
    if (!updated) return null;
    return insertTransitionNotification(
      tx,
      updated,
      updated.customerId,
      actorName,
    );
  });
}

/** Customer or provider cancels before work begins. */
export async function cancelBooking(
  userId: string,
  bookingId: string,
  actorName: string,
): Promise<TransitionOutcome | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
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
    if (!updated) return null;
    // Notify the other party.
    const counterpartyId =
      updated.customerId === userId ? updated.providerId : updated.customerId;
    return insertTransitionNotification(
      tx,
      updated,
      counterpartyId,
      actorName,
    );
  });
}

/**
 * Push a transition notification over sockets. The row was already
 * persisted atomically with the status change — this is emit-only
 * (side effects must never run inside the transaction).
 */
export async function notifyBookingUpdate(options: {
  userId: string;
  result: TransitionResult;
  notification: {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
  };
}): Promise<void> {
  emitToUser(options.userId, "booking:updated", {
    bookingId: options.result.id,
    bookingNumber: options.result.bookingNumber,
    status: options.result.status,
  });
  emitToUser(options.userId, "notification:new", {
    id: options.notification.id,
    bookingId: options.result.id,
    bookingNumber: options.result.bookingNumber,
    title: options.notification.title,
    message: options.notification.message,
    type: options.notification.type,
    createdAt: new Date().toISOString(),
  });
  void pushUnreadCount(options.userId);
}
