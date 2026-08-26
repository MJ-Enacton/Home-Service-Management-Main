"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/types";

async function requireAdmin(): Promise<
  { ok: true } | { ok: false; result: ActionResult }
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

  return { ok: true };
}

export async function banUser(
  targetUserId: string,
  reason: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  const trimmedReason = reason.trim();

  if (trimmedReason.length < 5) {
    return {
      success: false,
      error: "Please provide a reason of at least 5 characters.",
    };
  }

  try {
    const [target] = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, targetUserId));

    if (!target) {
      return { success: false, error: "User not found." };
    }

    if (target.role === "admin") {
      return { success: false, error: "Admin accounts cannot be banned." };
    }

    await db
      .update(user)
      .set({
        banned: true,
        banReason: trimmedReason,
        bannedAt: new Date(),
      })
      .where(eq(user.id, targetUserId));

    revalidatePath("/admin/users");
    revalidatePath("/admin/providers");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to ban user. Please try again." };
  }
}

export async function unbanUser(
  targetUserId: string,
  reason: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  const trimmedReason = reason.trim();

  if (trimmedReason.length < 5) {
    return {
      success: false,
      error: "Please provide a reason of at least 5 characters.",
    };
  }

  try {
    const [target] = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, targetUserId));

    if (!target) {
      return { success: false, error: "User not found." };
    }

    if (target.role === "admin") {
      return { success: false, error: "Admin accounts cannot be unbanned." };
    }

    await db
      .update(user)
      .set({
        banned: false,
        banReason: trimmedReason,
        bannedAt: null,
      })
      .where(eq(user.id, targetUserId));

    revalidatePath("/admin/users");
    revalidatePath("/admin/providers");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to unban user. Please try again." };
  }
}
