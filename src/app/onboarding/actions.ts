"use server";

import { headers } from "next/headers";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "@better-auth/core/db";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { account } from "@/lib/db/schema";
import { hasPassword } from "@/lib/auth/passwordConfigured";
import type { ActionResult } from "@/types";

/** Whether the current user can already sign in with email + password. */
export async function getPasswordStatus(): Promise<{ hasPassword: boolean }> {
  const session = await auth.api.getSession({ headers: await headers() });
  // No session here means the page redirects to sign-in anyway — hide the
  // password fields rather than flashing them.
  if (!session?.user) return { hasPassword: true };
  return { hasPassword: await hasPassword(session.user.id) };
}

/**
 * Set a first password for OAuth-only accounts (Google sign-ups finish
 * onboarding without one). Mirrors Better-Auth's own reset-password row so
 * email + password sign-in works immediately after.
 */
export async function setInitialPassword(
  password: string,
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "Please sign in again." };
  }
  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }
  if (await hasPassword(session.user.id)) {
    return {
      success: false,
      error: "A password is already set. Use Change password instead.",
    };
  }
  try {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      accountId: session.user.id,
      password: await hashPassword(password),
      // updated_at has no DB default ($onUpdate only) — must be set.
      updatedAt: new Date(),
    });
  } catch {
    return {
      success: false,
      error: "Could not save the password. Please try again.",
    };
  }
  return { success: true };
}
