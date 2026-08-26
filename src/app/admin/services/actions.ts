"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { serviceListings, user } from "@/lib/db/schema";
import type { ActionResult } from "@/types";

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; result: ActionResult }
> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const [currentUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id));

  if (currentUser?.role !== "admin") {
    return {
      ok: false,
      result: { success: false, error: "Only admins can perform this action." },
    };
  }

  return { ok: true, userId: session.user.id };
}

export async function setListingVerified(
  listingId: string,
  verified: boolean,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  try {
    await db
      .update(serviceListings)
      .set({ isVerified: verified })
      .where(eq(serviceListings.id, listingId));

    revalidatePath("/admin/services");
    revalidatePath("/allservices");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to update verification." };
  }
}

export async function setListingStatus(
  listingId: string,
  status: "active" | "inactive" | "draft",
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  try {
    await db
      .update(serviceListings)
      .set({ status })
      .where(eq(serviceListings.id, listingId));

    revalidatePath("/admin/services");
    revalidatePath("/allservices");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to update listing status." };
  }
}
