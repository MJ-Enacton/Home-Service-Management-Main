"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  getAdminRevenueSeries,
  getAdminBookingsStatusSeries,
  getAdminUserGrowthSeries,
  type AdminRange,
} from "@/lib/db/queries/admin-stats";

type AdminSeriesType = "revenue" | "bookings-status" | "user-growth";

/** Admin dashboard series via server actions. */
export async function getAdminSeries(
  type: AdminSeriesType,
  range: AdminRange,
): Promise<{ success: true; points: unknown[] } | { success: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "admin") {
    return { success: false, error: "Admin only." };
  }
  const safeRange: AdminRange = range === "month" ? "month" : "week";

  if (type === "revenue") {
    const points = await getAdminRevenueSeries(safeRange);
    return { success: true, points };
  }
  if (type === "bookings-status") {
    const points = await getAdminBookingsStatusSeries(safeRange);
    return { success: true, points };
  }
  if (type === "user-growth") {
    const points = await getAdminUserGrowthSeries(safeRange);
    return { success: true, points };
  }
  return { success: false, error: "Invalid series type." };
}