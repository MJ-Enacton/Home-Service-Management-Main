"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { providerAvailability, providerProfiles } from "@/lib/db/schema";
import type { ActionResult } from "@/types";
import { availabilityWindowSchema } from "@/lib/validators";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const profileSchema = z.object({
  bio: z.string().max(1000, "Bio must be under 1000 characters."),
  yearsExperience: z
    .number({ message: "Years of experience is required." })
    .int()
    .min(0)
    .max(60),
  serviceAreas: z.array(z.string().trim().min(1).max(60)).max(10),
});

const avatarSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.string().startsWith("image/", "Only image files are allowed."),
});

async function requireProvider(): Promise<
  | { ok: true; userId: string; name: string }
  | { ok: false; result: ActionResult }
> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.role !== "provider") {
    return {
      ok: false,
      result: {
        success: false,
        error: "Only providers have a professional profile.",
      },
    };
  }

  return { ok: true, userId: session.user.id, name: session.user.name };
}

export interface SaveProviderProfileInput {
  bio?: string;
  yearsExperience?: number;
  serviceAreas?: string[];
  avatar?: { base64: string; mimeType: string } | null;
  removeAvatar?: boolean;
}

export async function saveProviderProfile(
  input: unknown,
): Promise<ActionResult> {
  const guard = await requireProvider();
  if (!guard.ok) return guard.result;

  const parsed = profileSchema.safeParse({
    bio:
      typeof (input as { bio?: unknown })?.bio === "string"
        ? (input as { bio: string }).bio
        : "",
    yearsExperience: (input as { yearsExperience?: unknown })?.yearsExperience,
    serviceAreas: Array.isArray(
      (input as { serviceAreas?: unknown })?.serviceAreas,
    )
      ? (input as { serviceAreas: string[] }).serviceAreas
          .map((area) => area.trim())
          .filter(Boolean)
      : [],
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid profile data.",
    };
  }

  let avatarColumns: Record<string, unknown> = {};
  if ((input as SaveProviderProfileInput).removeAvatar) {
    avatarColumns = { avatarData: null, avatarMime: null };
  } else if ((input as SaveProviderProfileInput).avatar) {
    const avatarParsed = avatarSchema.safeParse(
      (input as SaveProviderProfileInput).avatar,
    );
    if (!avatarParsed.success) {
      return {
        success: false,
        error: avatarParsed.error.issues[0]?.message ?? "Invalid image.",
      };
    }
    const sizeBytes = Math.ceil((avatarParsed.data.base64.length * 3) / 4);
    if (sizeBytes > MAX_AVATAR_BYTES) {
      return { success: false, error: "Photo must be smaller than 2 MB." };
    }
    avatarColumns = {
      avatarData: avatarParsed.data.base64,
      avatarMime: avatarParsed.data.mimeType,
    };
  }

  try {
    await db
      .insert(providerProfiles)
      .values({
        userId: guard.userId,
        bio: parsed.data.bio || null,
        yearsExperience: parsed.data.yearsExperience,
        serviceAreas: parsed.data.serviceAreas,
        ...avatarColumns,
      })
      .onConflictDoUpdate({
        target: providerProfiles.userId,
        set: {
          bio: parsed.data.bio || null,
          yearsExperience: parsed.data.yearsExperience,
          serviceAreas: parsed.data.serviceAreas,
          ...(Object.keys(avatarColumns).length > 0 ? avatarColumns : {}),
        },
      });

    revalidatePath("/provider/profile");
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "Failed to save your professional profile.",
    };
  }
}

export async function saveAvailability(
  windowsInput: unknown,
): Promise<ActionResult> {
  const guard = await requireProvider();
  if (!guard.ok) return guard.result;

  const listSchema = z.array(availabilityWindowSchema).max(28);
  const parsed = listSchema.safeParse(windowsInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid availability data.",
    };
  }

  // Reject duplicate day+start combos so the UI stays predictable.
  const seen = new Set<string>();
  for (const window of parsed.data) {
    const key = `${window.dayOfWeek}-${window.startTime}`;
    if (seen.has(key)) {
      return {
        success: false,
        error: "Duplicate time slot on the same day is not allowed.",
      };
    }
    seen.add(key);
  }

  try {
    await db
      .delete(providerAvailability)
      .where(eq(providerAvailability.providerId, guard.userId));

    if (parsed.data.length > 0) {
      await db.insert(providerAvailability).values(
        parsed.data.map((window) => ({
          providerId: guard.userId,
          dayOfWeek: window.dayOfWeek,
          startTime: window.startTime,
          endTime: window.endTime,
          isActive: true,
        })),
      );
    }

    revalidatePath("/provider/profile");
    revalidatePath("/profile");
    return { success: true };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "Failed to save availability. Please try again.",
    };
  }
}
