"use server";

import { and, eq, ne, sql } from "drizzle-orm";
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
} from "@/lib/db/schema";
import type { BatchItem } from "drizzle-orm/batch";
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
import type { Slot } from "@/lib/availability";
import { emitToUser } from "@/lib/socket/emit";
import {
  pushUnreadCount,
  type NewRequestEvent,
} from "@/lib/socket/notify";

export interface BookServiceInput {
  listingId: string;
  details: unknown;
  schedule: unknown;
  paymentMethod: "card" | "paypal" | "wallet";
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
          sql`${bookings.scheduledDate} >= ${`${date} 00:00:00`}::timestamp`,
          sql`${bookings.scheduledDate} < ${`${date} 23:59:59`}::timestamp`,
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
  });

  return { success: true, slots };
}

/** Mock gateway reference, e.g. "mock_card_4242_9f3a71c02b5d". */
function buildMockExternalId(
  method: "card" | "paypal" | "wallet",
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

  if (!["card", "paypal", "wallet"].includes(input.paymentMethod)) {
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

  // Re-validate the slot at booking time to avoid double-booking races.
  const slotCheck = await getScheduleOptions(
    listing.id,
    schedule.data.scheduledDate,
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

  const scheduledDate = new Date(
    `${schedule.data.scheduledDate}T${schedule.data.scheduledTimeSlot}:00`,
  );
  if (Number.isNaN(scheduledDate.getTime())) {
    return { success: false, error: "Invalid schedule." };
  }

  const pricing = computePriceBreakdown(baseCents);
  const notificationId = crypto.randomUUID();

  try {
    let bookingId: string | undefined;
    let bookingNumber: string | undefined;

    // Insert the booking first (retry on rare booking-number collisions),
    // so payments/notifications can reference it.
    for (let attempt = 0; attempt < 5 && !bookingId; attempt++) {
      try {
        bookingNumber = generateBookingNumber();
        const [inserted] = await db
          .insert(bookings)
          .values({
            bookingNumber: bookingNumber!,
            listingId: listing.id,
            tierId,
            customerId: session.user.id,
            providerId: listing.providerId,
            status: "requested",
            ...details.data,
            scheduledDate,
            scheduledTimeSlot: schedule.data.scheduledTimeSlot,
            isContactless: schedule.data.isContactless,
            isUrgent: schedule.data.isUrgent,
            serviceFee: pricing.serviceFeeCents,
            taxAmount: pricing.taxCents,
            totalAmount: pricing.totalCents,
          })
          .returning({ id: bookings.id });
        bookingId = inserted?.id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("bookings_booking_number_unique")) {
          continue; // regenerate and retry
        }
        throw err;
      }
    }

    if (!bookingId || !bookingNumber) {
      return { success: false, error: "Failed to create booking." };
    }

    const message = `New booking request "${bookingNumber}" for "${listing.title}" on ${scheduledDate.toLocaleString("en-IN")}.`;

    const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
      db.insert(payments).values({
        bookingId,
        method: input.paymentMethod as "card" | "paypal" | "wallet",
        status: "paid",
        amountPaid: pricing.totalCents,
        paidAt: new Date(),
        externalId: buildMockExternalId(input.paymentMethod, input.payment?.cardLast4),
      }),
      db.insert(notifications).values({
        id: notificationId,
        userId: listing.providerId,
        bookingId,
        type: "new_request",
        title: "New booking request",
        message,
      }),
    ];

    await db.batch(statements);

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
    void pushUnreadCount(listing.providerId);

    return { success: true, bookingNumber };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "Failed to book service. Please try again.",
    };
  }
}
