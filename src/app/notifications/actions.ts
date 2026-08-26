"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import {
  bookings,
  notifications,
} from "@/lib/db/schema";
import type { ActionResult } from "@/types";
import { emitToUser } from "@/lib/socket/emit";
import { pushUnreadCount } from "@/lib/socket/notify";

/**
 * Provider decision on an incoming booking request.
 * Atomic conditional UPDATE — Postgres row locks during the statement, so
 * concurrent clicks can't double-confirm; zero updated rows means someone
 * else got there first (or the schedule conflicts).
 */
export async function respondToBooking(
  notificationId: string,
  accept: boolean,
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.role !== "provider") {
    return { success: false, error: "Only providers can manage requests." };
  }

  try {
    // The notification must belong to this provider and link to a booking.
    const [notification] = await db
      .select({ bookingId: notifications.bookingId })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, session.user.id),
        ),
      );

    if (!notification?.bookingId) {
      return { success: false, error: "Notification or booking not found." };
    }

    const now = new Date();

    // Schedule-conflict guard only matters when accepting: reject the accept
    // when this provider already holds an active booking at the same date+slot.
    const conflictGuard = accept
      ? sql`not exists (
          select 1 from bookings other
          where other.provider_id = ${session.user.id}
            and other.scheduled_date = ${bookings.scheduledDate}
            and other.scheduled_time_slot = ${bookings.scheduledTimeSlot}
            and other.status not in ('cancelled', 'completed')
            and other.id <> ${notification.bookingId}
        )`
      : undefined;

    const [updated] = await db
      .update(bookings)
      .set(
        accept
          ? { status: "confirmed", confirmedAt: now }
          : { status: "cancelled", cancelledAt: now },
      )
      .where(
        and(
          eq(bookings.id, notification.bookingId),
          eq(bookings.providerId, session.user.id),
          eq(bookings.status, "requested"),
          ...(conflictGuard ? [conflictGuard] : []),
        ),
      )
      .returning({
        id: bookings.id,
        customerId: bookings.customerId,
        bookingNumber: bookings.bookingNumber,
      });

    if (!updated) {
      const [target] = await db
        .select({ status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, notification.bookingId));

      if (target?.status !== "requested") {
        return {
          success: false,
          error: "This request was already handled.",
        };
      }
      return { success: false, error: "Failed to update the booking." };
    }

    // Mark this provider's notification as read.
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(eq(notifications.id, notificationId));

    // Notify the customer of the outcome.
    const message = accept
      ? `Your booking ${updated.bookingNumber} has been confirmed by ${session.user.name}.`
      : `Your booking ${updated.bookingNumber} was declined by ${session.user.name}.`;

    const customerNotificationId = crypto.randomUUID();
    await db.insert(notifications).values({
      id: customerNotificationId,
      userId: updated.customerId,
      bookingId: updated.id,
      type: accept ? "request_accepted" : "booking_cancelled",
      title: accept ? "Booking confirmed" : "Booking declined",
      message,
    });

    emitToUser(updated.customerId, "booking:updated", {
      bookingId: updated.id,
      bookingNumber: updated.bookingNumber,
      status: accept ? "confirmed" : "cancelled",
    });
    emitToUser(updated.customerId, "notification:new", {
      id: customerNotificationId,
      bookingId: updated.id,
      bookingNumber: updated.bookingNumber,
      title: accept ? "Booking confirmed" : "Booking declined",
      message,
      type: accept ? "request_accepted" : "booking_cancelled",
      createdAt: new Date().toISOString(),
    });
    void pushUnreadCount(updated.customerId);
    void pushUnreadCount(session.user.id);

    revalidatePath("/notifications");

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to respond to the request." };
  }
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, session.user.id)),
      );

    void pushUnreadCount(session.user.id);
    revalidatePath("/notifications");

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to mark notification as read." };
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          isNull(notifications.readAt),
        ),
      );

    void pushUnreadCount(session.user.id);
    revalidatePath("/notifications");

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to mark all as read." };
  }
}
