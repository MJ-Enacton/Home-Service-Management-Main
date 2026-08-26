"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import {
  bookings,
  categories,
  listingImages,
  serviceListings,
  serviceTiers,
  user,
} from "@/lib/db/schema";
import type { ActionResult } from "@/types";
import { listingSchema, tierSchema } from "@/lib/validators";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

const saveSchema = z.object({
  id: z.uuid().nullish(),
  status: z.enum(["active", "inactive", "draft"]).default("active"),
  listing: listingSchema,
  tiers: z.array(tierSchema).max(5),
  images: z
    .array(
      z.object({
        base64: z.string().min(1),
        mimeType: z.string().startsWith("image/", "Only image files."),
        altText: z.string().max(120).nullish(),
      }),
    )
    .max(6),
});

async function requireProvider(): Promise<
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

  if (currentUser?.role !== "provider") {
    return {
      ok: false,
      result: { success: false, error: "Only providers can manage listings." },
    };
  }

  return { ok: true, userId: session.user.id };
}

export async function saveListing(input: unknown): Promise<ActionResult> {
  const guard = await requireProvider();
  if (!guard.ok) return guard.result;

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid listing data.",
    };
  }
  const { id, status, listing, tiers, images } = parsed.data;

  for (const image of images) {
    const sizeBytes = Math.ceil((image.base64.length * 3) / 4);
    if (sizeBytes > MAX_IMAGE_BYTES) {
      return { success: false, error: "Each image must be smaller than 2 MB." };
    }
  }

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, listing.categorySlug));

  if (!category) {
    return { success: false, error: "Selected category does not exist." };
  }

  try {
    let listingId = id ?? null;

    if (listingId) {
      // Ownership check before touching anything.
      const [existing] = await db
        .select({ providerId: serviceListings.providerId })
        .from(serviceListings)
        .where(eq(serviceListings.id, listingId));

      if (!existing) {
        return { success: false, error: "Listing not found." };
      }
      if (existing.providerId !== guard.userId) {
        return {
          success: false,
          error: "You can only edit your own listings.",
        };
      }

      await db
        .update(serviceListings)
        .set({
          title: listing.title,
          description: listing.description ?? null,
          categoryId: category.id,
          pricingType: listing.pricingType,
          basePrice: listing.basePriceCents,
          location: listing.location ?? null,
          estimatedDuration: listing.estimatedDuration ?? null,
          tags: listing.tags,
          status,
        })
        .where(eq(serviceListings.id, listingId));

      // Replace tiers and images wholesale.
      await db.delete(serviceTiers).where(eq(serviceTiers.listingId, listingId));
      await db
        .delete(listingImages)
        .where(eq(listingImages.listingId, listingId));
    } else {
      const [created] = await db
        .insert(serviceListings)
        .values({
          providerId: guard.userId,
          categoryId: category.id,
          title: listing.title,
          description: listing.description ?? null,
          pricingType: listing.pricingType,
          basePrice: listing.basePriceCents,
          location: listing.location ?? null,
          estimatedDuration: listing.estimatedDuration ?? null,
          tags: listing.tags,
          status,
        })
        .returning({ id: serviceListings.id });

      if (!created) {
        return { success: false, error: "Failed to create listing." };
      }
      listingId = created.id;
    }

    if (tiers.length > 0) {
      await db.insert(serviceTiers).values(
        tiers.map((tier, index) => ({
          listingId: listingId!,
          name: tier.name,
          description: tier.description ?? null,
          price: tier.priceCents,
          displayOrder: tier.displayOrder || index,
        })),
      );
    }

    if (images.length > 0) {
      await db.insert(listingImages).values(
        images.map((image, index) => ({
          listingId: listingId!,
          imageData: image.base64,
          imageMime: image.mimeType,
          altText: image.altText || listing.title,
          displayOrder: index,
        })),
      );
    }

    revalidatePath("/my-services");
    revalidatePath("/allservices");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "Failed to save listing. Please try again.",
    };
  }
}

export async function deleteListing(listingId: string): Promise<ActionResult> {
  const guard = await requireProvider();
  if (!guard.ok) return guard.result;

  try {
    const [existing] = await db
      .select({ providerId: serviceListings.providerId })
      .from(serviceListings)
      .where(eq(serviceListings.id, listingId));

    if (!existing) {
      return { success: false, error: "Listing not found." };
    }
    if (existing.providerId !== guard.userId) {
      return { success: false, error: "You can only delete your own listings." };
    }

    await db.delete(serviceListings).where(eq(serviceListings.id, listingId));

    revalidatePath("/my-services");
    revalidatePath("/allservices");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("bookings_listing_id_service_listings_id_fk") ||
      message.includes("foreign key")
    ) {
      return {
        success: false,
        error:
          "This listing has bookings and cannot be deleted. Deactivate it instead.",
      };
    }
    return {
      success: false,
      error: "Failed to delete listing. Please try again.",
    };
  }
}

/** Used by the editor's delete button to warn about linked bookings first. */
export async function hasBookings(listingId: string): Promise<boolean> {
  const guard = await requireProvider();
  if (!guard.ok) return false;

  const [row] = await db
    .select({ one: bookings.id })
    .from(bookings)
    .where(eq(bookings.listingId, listingId))
    .limit(1);
  return Boolean(row);
}
