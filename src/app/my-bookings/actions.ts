"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { bookings, notifications, reviews } from "@/lib/db/schema";
import type { ActionResult } from "@/types";
import { reviewSchema } from "@/lib/validators";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  declineBooking,
  notifyBookingUpdate,
  startBooking,
} from "@/lib/booking-transitions";
import { emitToUser } from "@/lib/socket/emit";
import { pushUnreadCount } from "@/lib/socket/notify";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session;
}

export async function respondToBookingRequest(
  bookingId: string,
  accept: boolean,
): Promise<ActionResult> {
  const session = await getSession();

  if (session.user.role !== "provider") {
    return { success: false, error: "Only providers can manage requests." };
  }

  const result = accept
    ? await confirmBooking(session.user.id, bookingId)
    : await declineBooking(session.user.id, bookingId);

  if (!result) {
    return {
      success: false,
      error: accept
        ? "This request is no longer available or conflicts with your schedule."
        : "This request was already handled.",
    };
  }

  // Notify the customer; the provider's copy lives on /notifications.
  await notifyBookingUpdate({
    userId: result.customerId,
    actorName: session.user.name,
    result,
  });
  // Also push to the actor so their own my-bookings page refreshes.
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  revalidatePath("/my-bookings");
  return { success: true };
}

export async function startJob(bookingId: string): Promise<ActionResult> {
  const session = await getSession();

  const result = await startBooking(session.user.id, bookingId);
  if (!result) {
    return {
      success: false,
      error: "Only confirmed bookings assigned to you can be started.",
    };
  }

  await notifyBookingUpdate({
    userId: result.customerId,
    actorName: session.user.name,
    result,
  });
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  revalidatePath("/my-bookings");
  return { success: true };
}

export async function completeJob(bookingId: string): Promise<ActionResult> {
  const session = await getSession();

  const result = await completeBooking(session.user.id, bookingId);
  if (!result) {
    return {
      success: false,
      error: "Only in-progress jobs assigned to you can be completed.",
    };
  }

  await notifyBookingUpdate({
    userId: result.customerId,
    actorName: session.user.name,
    result,
  });
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  revalidatePath("/my-bookings");
  return { success: true };
}

export async function cancelMyBooking(
  bookingId: string,
): Promise<ActionResult> {
  const session = await getSession();

  const result = await cancelBooking(session.user.id, bookingId);
  if (!result) {
    return {
      success: false,
      error: "Only requested or confirmed bookings can still be cancelled.",
    };
  }

  // Notify the other party.
  const counterpartyId =
    result.customerId === session.user.id
      ? result.providerId
      : result.customerId;
  await notifyBookingUpdate({
    userId: counterpartyId,
    actorName: session.user.name,
    result,
  });
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  revalidatePath("/my-bookings");
  return { success: true };
}

export async function submitReview(input: {
  bookingId: string;
  rating: number;
  comment?: string;
}): Promise<ActionResult> {
  const session = await getSession();

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid review.",
    };
  }

  try {
    const [booking] = await db
      .select({
        id: bookings.id,
        customerId: bookings.customerId,
        providerId: bookings.providerId,
        listingId: bookings.listingId,
        bookingNumber: bookings.bookingNumber,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.id, parsed.data.bookingId),
          eq(bookings.customerId, session.user.id),
        ),
      );

    if (!booking) {
      return { success: false, error: "Booking not found." };
    }
    if (booking.status !== "completed") {
      return {
        success: false,
        error: "You can review a service only after it's completed.",
      };
    }

    await db.insert(reviews).values({
      bookingId: booking.id,
      reviewerId: session.user.id,
      providerId: booking.providerId,
      listingId: booking.listingId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    });

    // Thank-you notification for the provider.
    const notificationId = crypto.randomUUID();
    await db.insert(notifications).values({
      id: notificationId,
      userId: booking.providerId,
      bookingId: booking.id,
      type: "new_review",
      title: "New review received",
      message: `${session.user.name} left a ${parsed.data.rating}-star review on booking ${booking.bookingNumber}.`,
    });
    emitToUser(booking.providerId, "notification:new", {
      id: notificationId,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      title: "New review received",
      message: `${session.user.name} left a ${parsed.data.rating}-star review on booking ${booking.bookingNumber}.`,
      type: "new_review",
      createdAt: new Date().toISOString(),
    });
    void pushUnreadCount(booking.providerId);

    revalidatePath("/my-bookings");
    return { success: true };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error:
        "Failed to submit review — you may have already reviewed this booking.",
    };
  }
}
