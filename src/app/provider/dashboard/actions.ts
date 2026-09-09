"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  getProviderEarningsSeries,
  type EarningsPoint,
  type EarningsRange,
} from "@/lib/db/queries/earnings";

/** Earnings series for the dashboard chart; always scoped to the session provider. */
export async function getEarningsSeries(
  range: EarningsRange,
): Promise<{ success: true; points: EarningsPoint[] } | { success: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "provider") {
    return { success: false, error: "Only providers can view earnings." };
  }
  const safeRange: EarningsRange = range === "month" ? "month" : "week";
  const points = await getProviderEarningsSeries(session.user.id, safeRange);
  return { success: true, points };
}
