import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { alias } from "drizzle-orm/pg-core";
import { bookings, serviceListings, user } from "@/lib/db/schema";

export interface AdminBookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  listingTitle: string;
  customerName: string;
  providerName: string;
  /** date-only "YYYY-MM-DD" */
  scheduledDate: string;
  scheduledTimeSlot: string;
  totalAmountCents: number;
  requestedAt: Date;
}

export type AdminBookingStatus =
  | "requested"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ListAdminBookingsOptions {
  search?: string;
  status?: AdminBookingStatus | string;
  page?: number;
  pageSize?: number;
}

/**
 * All bookings for admin view — paginated, filterable, searchable.
 */
export async function listAdminBookings(
  options: ListAdminBookingsOptions = {},
): Promise<{ items: AdminBookingRow[]; total: number }> {
  const { search = "", status = "", page = 1, pageSize = 15 } = options;

  const customerUser = alias(user, "customer");
  const providerUser = alias(user, "provider");

  const whereClauses = [];

  if (status) {
    whereClauses.push(eq(bookings.status, status as AdminBookingStatus));
  }

  if (search) {
    const q = `%${search.toLowerCase()}%`;
    whereClauses.push(
      or(
        ilike(bookings.bookingNumber, q),
        ilike(serviceListings.title, q),
        ilike(customerUser.name, q),
        ilike(providerUser.name, q),
        ilike(customerUser.email, q),
      ),
    );
  }

  const where = whereClauses.length > 0 ? and(...whereClauses) : undefined;

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .innerJoin(customerUser, eq(bookings.customerId, customerUser.id))
    .innerJoin(providerUser, eq(bookings.providerId, providerUser.id))
    .where(where);

  const items = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      listingTitle: serviceListings.title,
      customerName: customerUser.name,
      providerName: providerUser.name,
      scheduledDate: bookings.scheduledDate,
      scheduledTimeSlot: bookings.scheduledTimeSlot,
      totalAmountCents: bookings.totalAmount,
      requestedAt: bookings.requestedAt,
    })
    .from(bookings)
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .innerJoin(customerUser, eq(bookings.customerId, customerUser.id))
    .innerJoin(providerUser, eq(bookings.providerId, providerUser.id))
    .where(where)
    .orderBy(desc(bookings.requestedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { items, total };
}
