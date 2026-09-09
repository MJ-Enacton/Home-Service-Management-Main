import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db/db";
import {
  bookings,
  categories,
  payments,
  reviews,
  serviceListings,
  user,
} from "@/lib/db/schema";
import type { BookingListItem } from "@/types/booking";

/** Sum of successful payments per booking. */
const paidAgg = db
  .select({
    bookingId: payments.bookingId,
    amountPaidCents:
      sql<number>`coalesce(sum(${payments.amountPaid}), 0)::int`.as(
        "amount_paid_cents",
      ),
  })
  .from(payments)
  .where(eq(payments.status, "paid"))
  .groupBy(payments.bookingId)
  .as("paid_agg");

/** Bookings that already have a review. */
const reviewedAgg = db
  .select({ bookingId: reviews.bookingId })
  .from(reviews)
  .as("reviewed_agg");

interface BookingRow {
  id: string;
  bookingNumber: string;
  status: BookingListItem["status"];
  listingId: string;
  listingTitle: string;
  categoryName: string | null;
  counterpartyName: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  streetAddress: string;
  totalAmountCents: number;
  amountPaidCents: number | null;
  reviewed: boolean;
  requestedAt: Date;
}

function rowToListItem(row: BookingRow): BookingListItem {
  return {
    id: row.id,
    bookingNumber: row.bookingNumber,
    status: row.status,
    listingId: row.listingId,
    listingTitle: row.listingTitle,
    categoryName: row.categoryName,
    counterpartyName: row.counterpartyName,
    scheduledDate: row.scheduledDate,
    scheduledTimeSlot: row.scheduledTimeSlot,
    addressLine: row.streetAddress,
    totalAmountCents: row.totalAmountCents,
    amountPaidCents: row.amountPaidCents === 0 ? null : row.amountPaidCents,
    reviewed: row.reviewed,
    requestedAt: row.requestedAt,
  };
}

export async function listBookingsForCustomer(
  customerId: string,
): Promise<BookingListItem[]> {
  const providerUser = alias(user, "provider_user");
  const rows = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      listingId: bookings.listingId,
      listingTitle: serviceListings.title,
      categoryName: categories.name,
      counterpartyName: providerUser.name,
      scheduledDate: bookings.scheduledDate,
      scheduledTimeSlot: bookings.scheduledTimeSlot,
      streetAddress: bookings.streetAddress,
      totalAmountCents: bookings.totalAmount,
      amountPaidCents: sql<number | null>`${paidAgg.amountPaidCents}`,
      reviewed:
        sql<boolean>`${reviewedAgg.bookingId} is not null`.as("reviewed"),
      requestedAt: bookings.requestedAt,
    })
    .from(bookings)
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .leftJoin(categories, eq(serviceListings.categoryId, categories.id))
    .innerJoin(providerUser, eq(bookings.providerId, providerUser.id))
    .leftJoin(paidAgg, eq(paidAgg.bookingId, bookings.id))
    .leftJoin(reviewedAgg, eq(reviewedAgg.bookingId, bookings.id))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.requestedAt));
  return rows.map((row) => rowToListItem(row as unknown as BookingRow));
}

export async function listBookingsForProvider(
  providerId: string,
): Promise<BookingListItem[]> {
  const customerUser = alias(user, "customer_user");
  const rows = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      listingId: bookings.listingId,
      listingTitle: serviceListings.title,
      categoryName: categories.name,
      counterpartyName: customerUser.name,
      scheduledDate: bookings.scheduledDate,
      scheduledTimeSlot: bookings.scheduledTimeSlot,
      streetAddress: bookings.streetAddress,
      totalAmountCents: bookings.totalAmount,
      amountPaidCents: sql<number | null>`${paidAgg.amountPaidCents}`,
      reviewed:
        sql<boolean>`${reviewedAgg.bookingId} is not null`.as("reviewed"),
      requestedAt: bookings.requestedAt,
    })
    .from(bookings)
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .leftJoin(categories, eq(serviceListings.categoryId, categories.id))
    .innerJoin(customerUser, eq(bookings.customerId, customerUser.id))
    .leftJoin(paidAgg, eq(paidAgg.bookingId, bookings.id))
    .leftJoin(reviewedAgg, eq(reviewedAgg.bookingId, bookings.id))
    .where(eq(bookings.providerId, providerId))
    .orderBy(desc(bookings.requestedAt));
  return rows.map((row) => rowToListItem(row as unknown as BookingRow));
}
