"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import {
  bookings,
  notifications,
  payments,
  providerAvailability,
  serviceListings,
  serviceTiers,
  user,
} from "@/lib/db/schema";
import type { ActionResult, Payment } from "@/types";
import {
  bookingDetailsSchema,
  bookingScheduleSchema,
} from "@/lib/validators";
import {
  computePriceBreakdown,
  generateBookingNumber,
  providerShare,
} from "@/lib/pricing";
import { createRazorpayOrder, fetchRazorpayPayment, razorpayKeyId, razorpayKeySecret, verifyPaymentSignature } from "@/lib/razorpay";
import { generateSlots } from "@/lib/availability";
import { isDateWithinBookingWindow } from "@/lib/booking-window";
import type { Slot } from "@/lib/availability";
import { emitToUser } from "@/lib/socket/emit";
import { sendMail } from "@/lib/email/send";
import { paymentReceiptTemplate } from "@/lib/email/templates";
import { formatBookingSchedule, formatCents, todayLocalDate } from "@/lib/format";
import {
  pushUnreadCount,
  type NewRequestEvent,
} from "@/lib/socket/notify";
import {
  getListingReviews,
  type ReviewSort,
} from "@/lib/db/queries/listings";

/** Paginated reviews for the Top Reviews section (no auth required). */
export async function getServiceReviews(
  listingId: string,
  sort: ReviewSort = "top",
  page = 0,
  pageSize = 6,
) {
  const safeSort: ReviewSort =
    sort === "recent" || sort === "highest" || sort === "lowest"
      ? sort
      : "top";
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
  const safeSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(Math.floor(pageSize), 20)
      : 6;
  const reviews = await getListingReviews(
    listingId,
    safeSort,
    safeSize,
    safePage * safeSize,
  );
  return { success: true as const, reviews };
}

export interface BookServiceInput {
  listingId: string;
  details: unknown;
  schedule: unknown;
  paymentMethod: "card" | "upi";
}

export interface BookingPaymentOrder {
  orderId: string;
  amount: number;
  keyId: string;
}

export type BookServiceResult = ActionResult & {
  bookingNumber?: string;
  bookingId?: string;
  /** Present for online methods when the Razorpay order was created. */
  payment?: BookingPaymentOrder | null;
};

/** Slots for the schedule step: availability windows minus existing bookings. */
export async function getScheduleOptions(
  listingId: string,
  date: string, // YYYY-MM-DD
): Promise<{ success: boolean; slots?: Slot[]; error?: string }> {
  const [listing] = await db
    .select({ providerId: serviceListings.providerId })
    .from(serviceListings)
    .where(eq(serviceListings.id, listingId));

  if (!listing) {
    return { success: false, error: "Service not found." };
  }

  const targetDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(targetDate.getTime())) {
    return { success: false, error: "Invalid date." };
  }

  if (!isDateWithinBookingWindow(date)) {
    return {
      success: false,
      error: "Bookings are allowed only within the next 7 days (today included).",
    };
  }

  const [windows, bookedRows] = await Promise.all([
    db
      .select({
        dayOfWeek: providerAvailability.dayOfWeek,
        startTime: providerAvailability.startTime,
        endTime: providerAvailability.endTime,
        isActive: providerAvailability.isActive,
      })
      .from(providerAvailability)
      .where(
        and(
          eq(providerAvailability.providerId, listing.providerId),
          eq(providerAvailability.isActive, true),
        ),
      ),
    db
      .select({ slot: bookings.scheduledTimeSlot })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, listing.providerId),
          ne(bookings.status, "cancelled"),
          eq(bookings.scheduledDate, date),
        ),
      ),
  ]);

  // Providers without configured availability fall back to standard
  // business hours so they're still bookable.
  const effectiveWindows =
    windows.length > 0
      ? windows
      : [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        }));

  const slots = generateSlots({
    date: targetDate,
    windows: effectiveWindows,
    bookedSlotTimes: bookedRows.map((row) => row.slot),
    now: new Date(),
  });

  return { success: true, slots };
}

/**
 * Project-mode split (no Route): the provider's 85% is recorded as owed
 * in providerPayout and settled off-system; transferStatus stays 'none'.
 */
function providerSplit(totalPaise: number): {
  providerPayout: number;
  transferStatus: "none";
} {
  return {
    providerPayout: providerShare(totalPaise),
    transferStatus: "none",
  };
}

export async function bookService(
  input: BookServiceInput,
): Promise<BookServiceResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const details = bookingDetailsSchema.safeParse(input.details);
  if (!details.success) {
    return {
      success: false,
      error: details.error.issues[0]?.message ?? "Invalid job details.",
    };
  }

  // Resolve the service location. "saved" never trusts client coords —
  // re-read the default from the DB so a tampered request can't spoof it.
  let streetAddress = details.data.streetAddress;
  let latitude: number | null = details.data.latitude ?? null;
  let longitude: number | null = details.data.longitude ?? null;
  const usedSavedAddress = details.data.addressSource === "saved";
  if (usedSavedAddress) {
    const [me] = await db
      .select({ address: user.address, latitude: user.latitude, longitude: user.longitude })
      .from(user)
      .where(eq(user.id, session.user.id));
    if (!me?.address?.trim()) {
      return { success: false, error: "No saved address found — pick a location instead." };
    }
    streetAddress = me.address;
    latitude = me.latitude ?? null;
    longitude = me.longitude ?? null;
  }

  const schedule = bookingScheduleSchema.safeParse(input.schedule);
  if (!schedule.success) {
    return {
      success: false,
      error:
        schedule.error.issues[0]?.message ??
        "Please pick a date and time slot.",
    };
  }

  if (!["card", "upi"].includes(input.paymentMethod)) {
    return { success: false, error: "Select a payment method." };
  }

  const [listing] = await db
    .select({
      id: serviceListings.id,
      title: serviceListings.title,
      basePrice: serviceListings.basePrice,
      status: serviceListings.status,
      providerId: serviceListings.providerId,
    })
    .from(serviceListings)
    .where(eq(serviceListings.id, input.listingId));

  if (!listing || listing.status !== "active") {
    return { success: false, error: "This service is not available." };
  }

  if (listing.providerId === session.user.id) {
    return { success: false, error: "You cannot book your own service." };
  }

  // Resolve price from the selected tier (must belong to this listing).
  let baseCents = listing.basePrice;
  const tierId = schedule.data.tierId ?? null;
  if (tierId) {
    const [tier] = await db
      .select({ id: serviceTiers.id, price: serviceTiers.price })
      .from(serviceTiers)
      .where(
        and(eq(serviceTiers.id, tierId), eq(serviceTiers.listingId, listing.id)),
      );
    if (!tier) {
      return { success: false, error: "Selected pricing tier is invalid." };
    }
    baseCents = tier.price;
  }

  let scheduledDate: string;
  let scheduledTimeSlot: string;

  if (schedule.data.isUrgent) {
    const now = new Date();
    scheduledDate = todayLocalDate();
    scheduledTimeSlot = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  } else {
    if (!isDateWithinBookingWindow(schedule.data.scheduledDate!)) {
      return {
        success: false,
        error: "Bookings are allowed only within the next 7 days (today included).",
      };
    }
    const slotCheck = await getScheduleOptions(
      listing.id,
      schedule.data.scheduledDate!,
    );
    if (!slotCheck.success || !slotCheck.slots) {
      return {
        success: false,
        error: slotCheck.error ?? "Could not verify availability.",
      };
    }
    const requestedSlot = slotCheck.slots.find(
      (slot) => slot.time === schedule.data.scheduledTimeSlot,
    );
    if (!requestedSlot || requestedSlot.status !== "available") {
      return {
        success: false,
        error: "That time slot is no longer available. Please pick another.",
      };
    }

    scheduledDate = schedule.data.scheduledDate!;
    scheduledTimeSlot = schedule.data.scheduledTimeSlot!;
  }

  const pricing = computePriceBreakdown(baseCents);
  const notificationId = crypto.randomUUID();
  // Owed share recorded even before capture.
  const split = providerSplit(pricing.totalCents);

  try {
    let bookingId: string | undefined;
    let bookingNumber: string | undefined;
    // True when we resumed the customer's own in-flight booking instead
    // of inserting (double-click / retry race): no new rows, no duplicate
    // notification — just proceed to order creation for the owned row.
    let resumed = false;

    // Booking + payment + provider notification commit atomically: a
    // failure in any of them rolls back the whole unit, so a booking
    // can never exist without its payment/notification rows. Retry the
    // whole unit on rare booking-number collisions with a fresh number.
    for (let attempt = 0; attempt < 5 && !bookingId; attempt++) {
      const candidateNumber = generateBookingNumber();
      try {
        await db.transaction(async (tx) => {
          // Re-check the slot inside the transaction: the availability
          // read above ran before this write, so without this guard two
          // concurrent requests could book the same slot.
          const [conflict] = await tx
            .select({
              id: bookings.id,
              customerId: bookings.customerId,
              bookingNumber: bookings.bookingNumber,
            })
            .from(bookings)
            .where(
              and(
                eq(bookings.providerId, listing.providerId),
                eq(bookings.scheduledDate, scheduledDate),
                eq(bookings.scheduledTimeSlot, scheduledTimeSlot),
                ne(bookings.status, "cancelled"),
              ),
            )
            .limit(1);
          if (conflict) {
            // Own pending booking (double-click / parallel retry): resume
            // it for payment instead of erroring. Anything else owns the
            // slot — and only the row owner ever reaches Checkout.
            if (conflict.customerId === session.user.id) {
              const [ownPending] = await tx
                .select({ id: payments.id })
                .from(payments)
                .where(
                  and(
                    eq(payments.bookingId, conflict.id),
                    eq(payments.status, "pending"),
                  ),
                );
              if (ownPending) {
                bookingId = conflict.id;
                bookingNumber = conflict.bookingNumber;
                resumed = true;
                return;
              }
            }
            throw new Error("SLOT_TAKEN");
          }

          const { contactFullName, addressSource: _source, ...restDetails } = details.data;
          void _source;
          const [firstName, ...lastNameParts] = (contactFullName || "").split(
            " ",
          );
          const lastName = lastNameParts.join(" ");
          const [inserted] = await tx
            .insert(bookings)
            .values({
              bookingNumber: candidateNumber,
              listingId: listing.id,
              tierId,
              customerId: session.user.id,
              providerId: listing.providerId,
              status: "requested",
              ...restDetails,
              streetAddress,
              latitude,
              longitude,
              usedSavedAddress,
              contactFirstName: firstName || null,
              contactLastName: lastName || null,
              scheduledDate,
              scheduledTimeSlot,
              isContactless: schedule.data.isContactless,
              isUrgent: schedule.data.isUrgent,
              serviceFee: pricing.serviceFeeCents,
              taxAmount: pricing.taxCents,
              totalAmount: pricing.totalCents,
            })
            .returning({ id: bookings.id });
          if (!inserted) {
            throw new Error("Failed to create booking.");
          }

          const message = `New booking request "${candidateNumber}" for "${listing.title}" on ${formatBookingSchedule(scheduledDate, scheduledTimeSlot)}.`;

          await tx.insert(payments).values({
            bookingId: inserted.id,
            method: input.paymentMethod,
            // Online payments stay pending until Razorpay verification;
            // COD stays pending until cash collection (unchanged).
            status: "pending",
            amountPaid: pricing.totalCents,
            providerPayout: split.providerPayout,
            transferStatus: split.transferStatus,
          });
          await tx.insert(notifications).values({
            id: notificationId,
            userId: listing.providerId,
            bookingId: inserted.id,
            type: "new_request",
            title: "New booking request",
            message,
          });

          bookingId = inserted.id;
          bookingNumber = candidateNumber;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        // SLOT_TAKEN is the in-tx fast-path check; the unique index is the
        // backstop that wins real races (second committer fails here).
        if (
          message === "SLOT_TAKEN" ||
          message.includes("bookings_provider_slot_no_overlap")
        ) {
          return {
            success: false,
            error: "That time slot is no longer available. Please pick another.",
          };
        }
        if (message.includes("bookings_booking_number_unique")) {
          continue; // regenerate and retry
        }
        throw err;
      }
    }

    if (!bookingId || !bookingNumber) {
      return { success: false, error: "Failed to create booking." };
    }

    // Resumed bookings were already notified on the original attempt —
    // never duplicate the provider's inbox/notification on a retry.
    if (!resumed) {
      const message = `New booking request "${bookingNumber}" for "${listing.title}" on ${formatBookingSchedule(scheduledDate, scheduledTimeSlot)}.`;
      const payload: NewRequestEvent = {
        id: notificationId,
        bookingId,
        bookingNumber,
        message,
        listingTitle: listing.title,
        customerName: session.user.name,
        createdAt: new Date().toISOString(),
        type: "new_request",
      };
      emitToUser(listing.providerId, "notification:new", payload);
      emitToUser(listing.providerId, "booking:updated", {
        bookingId,
        bookingNumber,
        status: "requested",
      });
      void pushUnreadCount(listing.providerId);
    }

    // Create the Razorpay order AFTER the atomic unit (an external call
    // can't roll back). The booking already exists with a pending payment,
    // so an order failure still leaves a retryable booking instead of an
    // orphan charge.
    let payment: BookingPaymentOrder | null = null;
    {
      const orderRes = await createRazorpayOrder({
        amountPaise: pricing.totalCents,
        receipt: bookingId,
        notes: { booking_number: bookingNumber, listing_id: listing.id },
      });
      if (orderRes.ok) {
        payment = {
          orderId: orderRes.data.id,
          amount: orderRes.data.amount,
          keyId: razorpayKeyId(),
        };
        await db
          .update(payments)
          .set({ razorpayOrderId: orderRes.data.id })
          .where(
            and(
              eq(payments.bookingId, bookingId),
              eq(payments.status, "pending"),
            ),
          );
      }
    }

    return { success: true, bookingNumber, bookingId, payment };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "Failed to book service. Please try again.",
    };
  }
}

/** Payment receipt email (best-effort, never fails the caller). */
async function sendPaymentReceipt(bookingId: string): Promise<void> {
  const [detail] = await db
    .select({
      bookingNumber: bookings.bookingNumber,
      listingTitle: serviceListings.title,
      providerName: user.name,
      customerEmail: sql<string>`(select email from "user" where id = ${bookings.customerId})`,
      customerName: sql<string>`(select name from "user" where id = ${bookings.customerId})`,
      totalAmount: bookings.totalAmount,
      scheduledDate: bookings.scheduledDate,
      scheduledTimeSlot: bookings.scheduledTimeSlot,
    })
    .from(bookings)
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .innerJoin(user, eq(bookings.providerId, user.id))
    .where(eq(bookings.id, bookingId));
  if (!detail) return;
  await sendMail({
    to: detail.customerEmail,
    ...paymentReceiptTemplate({
      customerName: detail.customerName,
      bookingNumber: detail.bookingNumber,
      serviceTitle: detail.listingTitle,
      providerName: detail.providerName,
      amount: formatCents(detail.totalAmount),
      schedule: formatBookingSchedule(
        detail.scheduledDate,
        detail.scheduledTimeSlot,
      ),
    }),
  }).catch((err) => console.error("[email] receipt failed:", err));
}

function mapRazorpayMethod(
  method: string,
  fallback: Payment["method"],
): Payment["method"] {
  if (method === "upi") return "upi";
  if (method === "card") return "card";
  return fallback;
}

/**
 * Finalize an online payment after Razorpay Checkout: verifies the
 * signature server-side, confirms capture with Razorpay, then flips the
 * pending payment to paid. Safe to retry (idempotent on already-paid).
 */
export async function verifyBookingPayment(input: {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const [booking] = await db
    .select({ id: bookings.id, customerId: bookings.customerId })
    .from(bookings)
    .where(eq(bookings.id, input.bookingId));
  if (!booking || booking.customerId !== session.user.id) {
    return { success: false, error: "Booking not found." };
  }

  const [payment] = await db
    .select({
      id: payments.id,
      status: payments.status,
      method: payments.method,
      razorpayOrderId: payments.razorpayOrderId,
      transferId: payments.transferId,
    })
    .from(payments)
    .where(eq(payments.bookingId, input.bookingId));
  if (!payment) {
    return { success: false, error: "No payment found for this booking." };
  }
  if (payment.status === "paid") return { success: true };
  if (
    payment.status !== "pending" ||
    payment.razorpayOrderId !== input.razorpayOrderId
  ) {
    return { success: false, error: "This payment can no longer be completed." };
  }

  const signatureOk = verifyPaymentSignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature,
    razorpayKeySecret(),
  );
  if (!signatureOk) {
    return { success: false, error: "Payment verification failed." };
  }

  const fetched = await fetchRazorpayPayment(input.razorpayPaymentId);
  if (!fetched.ok || fetched.data.status !== "captured") {
    return {
      success: false,
      error: "Payment not captured yet. Please try again.",
    };
  }

  await db
    .update(payments)
    .set({
      status: "paid",
      paidAt: new Date(),
      method: mapRazorpayMethod(fetched.data.method, payment.method),
      externalId: input.razorpayPaymentId,
      razorpayPaymentId: input.razorpayPaymentId,
      transferStatus: payment.transferId ? "created" : "none",
    })
    .where(eq(payments.id, payment.id));

  void sendPaymentReceipt(input.bookingId);
  revalidatePath("/my-bookings");
  revalidatePath("/customer/my-bookings");
  revalidatePath("/provider/my-bookings");
  return { success: true };
}

/**
 * Pay-now retry for a pending online payment: creates a fresh Razorpay
 * order (old unpaid orders expire harmlessly) and returns Checkout params.
 */
export async function retryBookingPayment(
  bookingId: string,
): Promise<BookServiceResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const [booking] = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      listingId: bookings.listingId,
      status: bookings.status,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!booking || booking.customerId !== session.user.id) {
    return { success: false, error: "Booking not found." };
  }
  if (booking.status === "cancelled" || booking.status === "completed") {
    return { success: false, error: "This booking can no longer be paid." };
  }

  const [payment] = await db
    .select({
      id: payments.id,
      status: payments.status,
      method: payments.method,
      amountPaid: payments.amountPaid,
    })
    .from(payments)
    .where(eq(payments.bookingId, bookingId));
  if (!payment) {
    return { success: false, error: "No payment found for this booking." };
  }
  if (payment.status === "paid") return { success: true };
  if (payment.status !== "pending") {
    return { success: false, error: "This payment cannot be retried online." };
  }

  const split = providerSplit(payment.amountPaid);
  const orderRes = await createRazorpayOrder({
    amountPaise: payment.amountPaid,
    receipt: booking.id,
    notes: { booking_number: booking.bookingNumber, retry: "true" },
  });
  if (!orderRes.ok) {
    return { success: false, error: "Could not start payment. Try again." };
  }

  await db
    .update(payments)
    .set({
      razorpayOrderId: orderRes.data.id,
      providerPayout: split.providerPayout,
      transferStatus: split.transferStatus,
    })
    .where(eq(payments.id, payment.id));

  return {
    success: true,
    bookingNumber: booking.bookingNumber,
    bookingId: booking.id,
    payment: {
      orderId: orderRes.data.id,
      amount: orderRes.data.amount,
      keyId: razorpayKeyId(),
    },
  };
}
