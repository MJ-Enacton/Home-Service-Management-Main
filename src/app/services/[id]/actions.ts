"use server";

import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
import type { ActionResult } from "@/types";
import {
  bookingDetailsSchema,
  bookingScheduleSchema,
} from "@/lib/validators";
import {
  computePriceBreakdown,
  generateBookingNumber,
} from "@/lib/pricing";
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
  paymentMethod: "card" | "cod";
  /** Mock-gateway artifacts recorded on the payment row. */
  payment?: {
    cardLast4?: string;
  } | null;
}

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

/** Mock gateway reference, e.g. "mock_card_4242_9f3a71c02b5d". */
function buildMockExternalId(
  method: "card" | "cod",
  cardLast4?: string,
): string {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return method === "card" && cardLast4
    ? `mock_card_${cardLast4}_${token}`
    : `mock_${method}_${token}`;
}

export async function bookService(
  input: BookServiceInput,
): Promise<ActionResult & { bookingNumber?: string }> {
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

  const schedule = bookingScheduleSchema.safeParse(input.schedule);
  if (!schedule.success) {
    return {
      success: false,
      error:
        schedule.error.issues[0]?.message ??
        "Please pick a date and time slot.",
    };
  }

  if (!["card", "cod"].includes(input.paymentMethod)) {
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

  try {
    let bookingId: string | undefined;
    let bookingNumber: string | undefined;

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
            .select({ id: bookings.id })
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
            throw new Error("SLOT_TAKEN");
          }

          const { contactFullName, ...restDetails } = details.data;
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
            method: input.paymentMethod as "card" | "cod",
            status: input.paymentMethod === "cod" ? "pending" : "paid",
            amountPaid: pricing.totalCents,
            paidAt: new Date(),
            externalId: buildMockExternalId(
              input.paymentMethod,
              input.payment?.cardLast4,
            ),
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

    // Payment receipt (card = paid immediately; COD stays pending → skip).
    // Best-effort: booking success never depends on Gmail.
    if (input.paymentMethod !== "cod") {
      void (async () => {
        const [provider] = await db
          .select({ name: user.name })
          .from(user)
          .where(eq(user.id, listing.providerId));
        await sendMail({
          to: session.user.email,
          ...paymentReceiptTemplate({
            customerName: session.user.name,
            bookingNumber: bookingNumber!,
            serviceTitle: listing.title,
            providerName: provider?.name ?? "your provider",
            amount: formatCents(pricing.totalCents),
            schedule: formatBookingSchedule(scheduledDate, scheduledTimeSlot),
          }),
        });
      })().catch((err) => console.error("[email] receipt failed:", err));
    }

    return { success: true, bookingNumber };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "Failed to book service. Please try again.",
    };
  }
}
