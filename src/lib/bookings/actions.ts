"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import {
  bookings,
  notifications,
  reviews,
  serviceListings,
  user,
} from "@/lib/db/schema";
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
import { sendMail } from "@/lib/email/send";
import { bookingCompletedTemplate } from "@/lib/email/templates";
import { isSlotStartPassed } from "@/lib/booking-window";
import { formatBookingSchedule } from "@/lib/format";

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
    ? await confirmBooking(session.user.id, bookingId, session.user.name)
    : await declineBooking(session.user.id, bookingId, session.user.name);

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
    result,
    notification: {
      id: result.notificationId,
      title: result.notificationTitle,
      message: result.notificationMessage,
      type: result.notificationType,
    },
  });
  // Also push to the actor so their own my-bookings page refreshes.
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  revalidatePath("/my-bookings");
  revalidatePath("/customer/my-bookings");
  revalidatePath("/provider/my-bookings");
  return { success: true };
}

export async function startJob(bookingId: string): Promise<ActionResult> {
  const session = await getSession();

  // A job can only be started once its scheduled slot time has arrived.
  // Without this, tomorrow's job could be started right now. Urgent jobs
  // have no advance slot, so they stay exempt (same rule as completeJob).
  const [booking] = await db
    .select({
      id: bookings.id,
      providerId: bookings.providerId,
      status: bookings.status,
      scheduledDate: bookings.scheduledDate,
      scheduledTimeSlot: bookings.scheduledTimeSlot,
      isUrgent: bookings.isUrgent,
    })
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.providerId, session.user.id)),
    );
  if (!booking) {
    return { success: false, error: "Booking not found." };
  }
  if (booking.status !== "confirmed") {
    return {
      success: false,
      error: "Only confirmed bookings assigned to you can be started.",
    };
  }
  if (
    !booking.isUrgent &&
    !isSlotStartPassed(booking.scheduledDate, booking.scheduledTimeSlot)
  ) {
    return {
      success: false,
      error: `This job is scheduled for ${formatBookingSchedule(booking.scheduledDate, booking.scheduledTimeSlot)}. You can start it at or after the scheduled time.`,
    };
  }

  const result = await startBooking(
    session.user.id,
    bookingId,
    session.user.name,
  );
  if (!result) {
    return {
      success: false,
      error: "Only confirmed bookings assigned to you can be started.",
    };
  }

  await notifyBookingUpdate({
    userId: result.customerId,
    result,
    notification: {
      id: result.notificationId,
      title: result.notificationTitle,
      message: result.notificationMessage,
      type: result.notificationType,
    },
  });
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  revalidatePath("/my-bookings");
  revalidatePath("/customer/my-bookings");
  revalidatePath("/provider/my-bookings");
  return { success: true };
}

export async function completeJob(bookingId: string): Promise<ActionResult> {
  const session = await getSession();

  // A job can only be completed (and its review email sent) once its
  // scheduled slot has actually started. Without this, confirm → start →
  // complete click-through fires the "leave a review" email before any
  // real work — e.g. seconds after a card payment. Urgent jobs have no
  // advance slot, so they stay exempt.
  const [booking] = await db
    .select({
      id: bookings.id,
      providerId: bookings.providerId,
      status: bookings.status,
      scheduledDate: bookings.scheduledDate,
      scheduledTimeSlot: bookings.scheduledTimeSlot,
      isUrgent: bookings.isUrgent,
    })
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.providerId, session.user.id)),
    );
  if (!booking) {
    return { success: false, error: "Booking not found." };
  }
  if (booking.status !== "in_progress") {
    return {
      success: false,
      error: "Only in-progress jobs assigned to you can be completed.",
    };
  }
  if (
    !booking.isUrgent &&
    !isSlotStartPassed(booking.scheduledDate, booking.scheduledTimeSlot)
  ) {
    return {
      success: false,
      error: `This job is scheduled for ${formatBookingSchedule(booking.scheduledDate, booking.scheduledTimeSlot)}. You can mark it complete after the scheduled time.`,
    };
  }

  const result = await completeBooking(
    session.user.id,
    bookingId,
    session.user.name,
  );
  if (!result) {
    return {
      success: false,
      error: "Only in-progress jobs assigned to you can be completed.",
    };
  }

  await notifyBookingUpdate({
    userId: result.customerId,
    result,
    notification: {
      id: result.notificationId,
      title: result.notificationTitle,
      message: result.notificationMessage,
      type: result.notificationType,
    },
  });
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  // Thank-you email to the customer (best-effort, never fails the action).
  void (async () => {
    const [detail] = await db
      .select({
        listingTitle: serviceListings.title,
        customerEmail: user.email,
        customerName: user.name,
      })
      .from(bookings)
      .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
      .innerJoin(user, eq(bookings.customerId, user.id))
      .where(eq(bookings.id, result.id));
    if (!detail) return;
    const appBase =
      process.env.BETTER_AUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    await sendMail({
      to: detail.customerEmail,
      ...bookingCompletedTemplate({
        customerName: detail.customerName,
        bookingNumber: result.bookingNumber,
        serviceTitle: detail.listingTitle,
        providerName: session.user.name,
        reviewUrl: `${appBase}/customer/my-bookings?review=${result.id}`,
      }),
    });
  })().catch((err) => console.error("[email] completion mail failed:", err));

  revalidatePath("/my-bookings");
  revalidatePath("/customer/my-bookings");
  revalidatePath("/provider/my-bookings");
  return { success: true };
}

export async function cancelMyBooking(
  bookingId: string,
): Promise<ActionResult> {
  const session = await getSession();

  const result = await cancelBooking(
    session.user.id,
    bookingId,
    session.user.name,
  );
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
    result,
    notification: {
      id: result.notificationId,
      title: result.notificationTitle,
      message: result.notificationMessage,
      type: result.notificationType,
    },
  });
  emitToUser(session.user.id, "booking:updated", {
    bookingId: result.id,
    bookingNumber: result.bookingNumber,
    status: result.status,
  });

  revalidatePath("/my-bookings");
  revalidatePath("/customer/my-bookings");
  revalidatePath("/provider/my-bookings");
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

    // Review + provider notification commit atomically: a review can
    // never exist without its notification, and vice versa.
    const notificationId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(reviews).values({
        bookingId: booking.id,
        reviewerId: session.user.id,
        providerId: booking.providerId,
        listingId: booking.listingId,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      });

      // Thank-you notification for the provider.
      await tx.insert(notifications).values({
        id: notificationId,
        userId: booking.providerId,
        bookingId: booking.id,
        type: "new_review",
        title: "New review received",
        message: `${session.user.name} left a ${parsed.data.rating}-star review on booking ${booking.bookingNumber}.`,
      });
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
    revalidatePath("/customer/my-bookings");
    revalidatePath("/provider/my-bookings");
    revalidatePath(`/services/${booking.listingId}`);
    revalidatePath("/services");
    revalidatePath("/customer/notifications");
    revalidatePath("/provider/notifications");
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
