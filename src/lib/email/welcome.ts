"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { sendMail } from "./send";
import {
  welcomeCustomerTemplate,
  welcomeProviderTemplate,
} from "./templates";

function appUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}

export interface SendWelcomeEmailOptions {
  email?: string;
  role?: string;
}

/**
 * Sends the role-based welcome email for the currently signed-in user.
 * Best-effort (never throws). Call after OTP verification (password signups)
 * or after onboarding role selection (Google signups).
 *
 * If the session cookie isn't available yet, falls back to a DB lookup
 * by the provided email.
 */
export async function sendWelcomeEmailForCurrentUser(
  options?: SendWelcomeEmailOptions,
): Promise<{
  success: boolean;
}> {
  let recipientEmail: string | null = null;
  let recipientName: string = "there";
  let recipientRole: string = options?.role ?? "customer";

  // 1. Try resolving from the active session
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) {
      recipientEmail = session.user.email;
      recipientName = session.user.name ?? "there";
      recipientRole =
        (session.user as { role?: string }).role ?? recipientRole;
    }
  } catch {
    // Session lookup can fail if headers aren't available yet
  }

  // 2. Fallback: look up verified user by email
  if (!recipientEmail && options?.email) {
    try {
      const cleanEmail = options.email.toLowerCase().trim();
      const userRecord = await db.query.user.findFirst({
        where: eq(user.email, cleanEmail),
      });

      if (userRecord && userRecord.emailVerified) {
        recipientEmail = userRecord.email;
        recipientName = userRecord.name ?? "there";
        recipientRole = userRecord.role ?? recipientRole;
      }
    } catch (err) {
      console.error("[welcome] Error finding user by email:", err);
    }
  }

  if (!recipientEmail) return { success: false };

  const template =
    recipientRole === "provider"
      ? welcomeProviderTemplate(recipientName, appUrl())
      : welcomeCustomerTemplate(recipientName, appUrl());

  // Fire-and-forget so the UI never blocks on Gmail.
  void sendMail({ to: recipientEmail, ...template });
  return { success: true };
}
