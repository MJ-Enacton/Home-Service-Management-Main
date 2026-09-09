import { and, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { bookings, payments } from "@/lib/db/schema";

export type EarningsRange = "week" | "month";

export interface EarningsPoint {
  /** YYYY-MM-DD */
  date: string;
  /** Mon / 7 Sep */
  label: string;
  /** Net payout in cents (providerPayout, else total − fee − tax). */
  netCents: number;
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
 * Daily net earnings for a provider over a range.
 *
 * Net = payments.provider_payout when recorded, else
 *       total_amount − service_fee − tax_amount.
 * Only completed bookings count. Days without completions are
 * zero-filled so the axis stays continuous.
 */
export async function getProviderEarningsSeries(
  providerId: string,
  range: EarningsRange,
  now = new Date(),
): Promise<EarningsPoint[]> {
  const start = range === "week" ? startOfThisWeek(now) : startOfThisMonth(now);

  const rows = await db
    .select({
      completedAt: bookings.completedAt,
      totalAmount: bookings.totalAmount,
      serviceFee: bookings.serviceFee,
      taxAmount: bookings.taxAmount,
      providerPayout: payments.providerPayout,
    })
    .from(bookings)
    .leftJoin(payments, eq(payments.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.providerId, providerId),
        eq(bookings.status, "completed"),
        gte(bookings.completedAt, start),
      ),
    );

  // dayKey -> net cents
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (!row.completedAt) continue;
    const d = new Date(row.completedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const gross = row.totalAmount ?? 0;
    const net = Math.max(
      0,
      row.providerPayout ?? gross - (row.serviceFee ?? 0) - (row.taxAmount ?? 0),
    );
    byDay.set(key, (byDay.get(key) ?? 0) + net);
  }

  // Walk every calendar day from range start through today.
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const points: EarningsPoint[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    const label =
      range === "week"
        ? cursor.toLocaleDateString("en-US", { weekday: "short" })
        : cursor.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    points.push({
      date: key,
      label,
      netCents: byDay.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}
