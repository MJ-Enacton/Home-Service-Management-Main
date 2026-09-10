"use server";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { payments } from "@/lib/db/schema";
import type { ActionResult } from "@/types";

/**
 * Mark a paid provider share as settled (project mode: the admin pays
 * the provider off-system, then records it here). Idempotent.
 */
export async function markPayoutSettled(
  paymentId: string,
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "admin") {
    return { success: false, error: "Only admins can settle payouts." };
  }

  const [updated] = await db
    .update(payments)
    .set({ payoutSettledAt: new Date() })
    .where(
      and(
        eq(payments.id, paymentId),
        eq(payments.status, "paid"),
        isNull(payments.payoutSettledAt),
      ),
    )
    .returning({ id: payments.id });

  if (!updated) {
    return { success: false, error: "Payout not found or already settled." };
  }

  revalidatePath("/admin/revenue");
  return { success: true };
}
