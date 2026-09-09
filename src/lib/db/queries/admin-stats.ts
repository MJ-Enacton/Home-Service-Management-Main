import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { bookings, payments, user } from "@/lib/db/schema";

export type AdminRange = "week" | "month";

export interface AdminSeriesPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Mon / 7 Sep */
  label: string;
  /** Value for the day */
  value: number;
}

/** Monday 00:00 of the current week (local time). */
export function startOfThisWeek(now = new Date()): Date {
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  start.setHours(0, 0, 0, 0);
  return start;
}

/** 1st of the current month, 00:00 (local time). */
export function startOfThisMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Daily platform gross revenue (paid payments) over a range.
 * Zero-filled per day so the axis stays continuous.
 */
export async function getAdminRevenueSeries(
  range: AdminRange,
  now = new Date(),
): Promise<{ date: string; label: string; value: number }[]> {
  const start = range === "week" ? startOfThisWeek(now) : startOfThisMonth(now);

  const rows = await db
    .select({
      paidAt: payments.paidAt,
      amountPaid: payments.amountPaid,
    })
    .from(payments)
    .where(
      and(
        eq(payments.status, "paid"),
        gte(payments.paidAt, start),
      ),
    );

  // dayKey -> sum amountPaid
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (!row.paidAt) continue;
    const d = new Date(row.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, (byDay.get(key) ?? 0) + (row.amountPaid ?? 0));
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const points: { date: string; label: string; value: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    points.push({ date: key, label, value: byDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

/**
 * Daily bookings count by status over a range.
 * Returns one series per status with zero-filled days.
 */
export async function getAdminBookingsStatusSeries(
  range: AdminRange,
  now = new Date(),
): Promise<{
  date: string;
  label: string;
  requested: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}[]> {
  const start = range === "week" ? startOfThisWeek(now) : startOfThisMonth(now);
  const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  const rows = await db
    .select({
      scheduledDate: bookings.scheduledDate,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.scheduledDate, startKey),
      ),
    );

  // dayKey -> { status: count }
  type StatusCounts = {
    requested: number;
    confirmed: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  const emptyCounts = (): StatusCounts => ({
    requested: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  });
  const byDay = new Map<string, StatusCounts>();
  for (const row of rows) {
    if (!row.scheduledDate) continue;
    // scheduled_date is a date column: already "YYYY-MM-DD".
    const key = row.scheduledDate;
    const existing = byDay.get(key) ?? emptyCounts();
    if (row.status in existing) {
      existing[row.status as keyof StatusCounts] += 1;
    }
    byDay.set(key, existing);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const points: {
    date: string;
    label: string;
    requested: number;
    confirmed: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const day = byDay.get(key) ?? emptyCounts();
    points.push({ date: key, label, ...day });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

/**
 * Cumulative user growth (customers + providers) per day over a range.
 * Returns cumulative counts so the line always goes up.
 */
export async function getAdminUserGrowthSeries(
  range: AdminRange,
  now = new Date(),
): Promise<{
  date: string;
  label: string;
  customers: number;
  providers: number;
}[]> {
  const start = range === "week" ? startOfThisWeek(now) : startOfThisMonth(now);

  const rows = await db
    .select({
      createdAt: user.createdAt,
      role: user.role,
    })
    .from(user)
    .where(
      and(
        gte(user.createdAt, start),
      ),
    );

  // dayKey -> { customers, providers }
  const byDay = new Map<string, { customers: number; providers: number }>();
  for (const row of rows) {
    if (!row.createdAt) continue;
    const d = new Date(row.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const existing = byDay.get(key) ?? { customers: 0, providers: 0 };
    if (row.role === "customer") existing.customers += 1;
    if (row.role === "provider") existing.providers += 1;
    byDay.set(key, existing);
  }

  // Build cumulative
  let cumCustomers = 0;
  let cumProviders = 0;

  // Get total counts before range start
  const [{ count: prevCustomers }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(and(eq(user.role, "customer"), sql`${user.createdAt} < ${start.toISOString()}`));

  const [{ count: prevProviders }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(and(eq(user.role, "provider"), sql`${user.createdAt} < ${start.toISOString()}`));

  cumCustomers = prevCustomers ?? 0;
  cumProviders = prevProviders ?? 0;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const points: { date: string; label: string; customers: number; providers: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const day = byDay.get(key);
    if (day) {
      cumCustomers += day.customers;
      cumProviders += day.providers;
    }
    points.push({ date: key, label, customers: cumCustomers, providers: cumProviders });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}