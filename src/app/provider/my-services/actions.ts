"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import {
  consumePendingUploads,
  destroyAsset,
  isOwnedPublicId,
  isOwnCloudinaryUrl,
} from "@/lib/cloudinary";
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

const cloudinaryImageSchema = z.object({
  /** DB row id for images already saved; absent for fresh uploads. */
  id: z.uuid().nullish(),
  publicId: z.string().min(1).max(300).nullish(),
  secureUrl: z.string().url().max(1000).nullish(),
  altText: z.string().max(120).nullish(),
});

const saveSchema = z.object({
  id: z.uuid().nullish(),
  status: z
    .enum(["active", "inactive", "draft", "pending", "rejected"])
    .default("active"),
  listing: listingSchema,
  tiers: z.array(tierSchema).max(5),
  images: z.array(cloudinaryImageSchema).max(6),
});

async function requireProvider(): Promise<
  { ok: true; userId: string } | { ok: false; result: ActionResult }
> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.role !== "provider") {
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

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
  for (const image of images) {
    if (image.id) continue; // existing row — ownership verified below
    if (
      !image.publicId ||
      !image.secureUrl ||
      !isOwnedPublicId(image.publicId, "listings")
    ) {
      return { success: false, error: "Invalid image reference." };
    }
    if (!cloudName || !isOwnCloudinaryUrl(image.secureUrl, cloudName)) {
      return { success: false, error: "Invalid image URL." };
    }
  }

  // If tiers are provided but base pricing is missing, provide sensible defaults
  // since tiers define the actual pricing.
  const hasTiers = tiers.length > 0;
  const finalPricingType =
    listing.pricingType ?? (hasTiers ? "fixed" : "hourly");
  const finalBasePrice = listing.basePriceCents ?? (hasTiers ? 0 : 0);

  if (
    !hasTiers &&
    (!listing.pricingType ||
      listing.basePriceCents === undefined ||
      listing.basePriceCents === null)
  ) {
    return {
      success: false,
      error:
        "Base price and pricing type are required when no tiers are provided.",
    };
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

    // ---- Pre-transaction reads + validation (no writes yet) ----
    let removedImageIds: string[] = [];
    let removedPublicIds: string[] = [];
    if (listingId) {
      // Ownership check before touching anything.
      const [existing] = await db
        .select({
          providerId: serviceListings.providerId,
          status: serviceListings.status,
        })
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

      // Enforce max 5 active listings per provider.
      if (status === "active" && existing.status !== "active") {
        const [activeCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(serviceListings)
          .where(
            and(
              eq(serviceListings.providerId, guard.userId),
              eq(serviceListings.status, "active"),
            ),
          );
        if ((activeCount?.count ?? 0) >= 5) {
          return {
            success: false,
            error:
              "You can have at most 5 active services. Deactivate another service before activating this one.",
          };
        }
      }

      // Diff images: keep + reorder surviving rows, insert fresh uploads,
      // delete only what the provider actually removed.
      const currentImages = await db
        .select({ id: listingImages.id, publicId: listingImages.publicId })
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId));
      const currentById = new Map(currentImages.map((row) => [row.id, row]));
      const finalIds = new Set(
        images.map((image) => image.id).filter((v): v is string => Boolean(v)),
      );
      for (const image of images) {
        if (image.id && !currentById.has(image.id)) {
          return { success: false, error: "Invalid image reference." };
        }
      }
      const removed = currentImages.filter((row) => !finalIds.has(row.id));
      removedImageIds = removed.map((row) => row.id);
      removedPublicIds = removed
        .map((row) => row.publicId)
        .filter((v): v is string => Boolean(v));
    } else {
      // Block creation entirely when provider already has 5 active services.
      const [activeCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(serviceListings)
        .where(
          and(
            eq(serviceListings.providerId, guard.userId),
            eq(serviceListings.status, "active"),
          ),
        );
      if ((activeCount?.count ?? 0) >= 5) {
        return {
          success: false,
          error:
            "You have reached the limit of 5 active services. Deactivate or delete an active service before creating a new one.",
        };
      }
    }

    const newStatus = listingId ? null : status === "active" ? "pending" : status;
    // Admins to notify on the create path (read before the transaction).
    const admins =
      !listingId && newStatus === "pending"
        ? await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.role, "admin"))
        : [];

    // Fresh uploads at their final positions (kept rows are reordered
    // inside the transaction on the edit path).
    const addedWithIndex = images
      .map((image, index) => ({ image, index }))
      .filter(({ image }) => !image.id);

    // ---- One transaction for ALL writes: listing + tiers + images +
    // admin notifications commit atomically, so a listing can never be
    // left half-saved. ----
    await db.transaction(async (tx) => {
      if (listingId) {
        await tx
          .update(serviceListings)
          .set({
            title: listing.title,
            description: listing.description ?? null,
            categoryId: category.id,
            pricingType: finalPricingType,
            basePrice: finalBasePrice,
            location: listing.location ?? null,
            estimatedDuration: listing.estimatedDuration ?? null,
            tags: listing.tags,
            status,
          })
          .where(eq(serviceListings.id, listingId));

        await tx
          .delete(serviceTiers)
          .where(eq(serviceTiers.listingId, listingId));
        if (removedImageIds.length > 0) {
          await tx.delete(listingImages).where(
            and(
              eq(listingImages.listingId, listingId),
              inArray(listingImages.id, removedImageIds),
            ),
          );
        }
        for (const [index, image] of images.entries()) {
          if (!image.id) continue;
          await tx
            .update(listingImages)
            .set({
              altText: image.altText || listing.title,
              displayOrder: index,
            })
            .where(eq(listingImages.id, image.id));
        }
      } else {
        const [created] = await tx
          .insert(serviceListings)
          .values({
            providerId: guard.userId,
            categoryId: category.id,
            title: listing.title,
            description: listing.description ?? null,
            pricingType: finalPricingType,
            basePrice: finalBasePrice,
            location: listing.location ?? null,
            estimatedDuration: listing.estimatedDuration ?? null,
            tags: listing.tags,
            status: newStatus!,
          })
          .returning({ id: serviceListings.id });

        if (!created) {
          throw new Error("Failed to create listing.");
        }
        listingId = created.id;

        if (newStatus === "pending" && admins.length > 0) {
          const { notifications } = await import("@/lib/db/schema");
          await tx.insert(notifications).values(
            admins.map((a) => ({
              id: crypto.randomUUID(),
              userId: a.id,
              type: "system" as const,
              title: "New Service Requires Approval",
              message: `A new service "${listing.title}" has been proposed by a provider and requires your approval.`,
            })),
          );
        }
      }

      if (tiers.length > 0) {
        await tx.insert(serviceTiers).values(
          tiers.map((tier, index) => ({
            listingId: listingId!,
            name: tier.name,
            description: tier.description ?? null,
            price: tier.priceCents,
            displayOrder: tier.displayOrder || index,
          })),
        );
      }

      if (addedWithIndex.length > 0) {
        await tx.insert(listingImages).values(
          addedWithIndex.map(({ image, index }) => ({
            listingId: listingId!,
            publicId: image.publicId!,
            secureUrl: image.secureUrl!,
            altText: image.altText || listing.title,
            displayOrder: index,
          })),
        );
      }
    });

    // ---- Post-commit side effects (never inside the transaction) ----
    if (addedWithIndex.length > 0) {
      await consumePendingUploads(
        guard.userId,
        addedWithIndex
          .map(({ image }) => image.publicId)
          .filter((v): v is string => Boolean(v)),
      );
    }
    for (const publicId of removedPublicIds) {
      void destroyAsset(publicId);
    }

    revalidatePath("/provider/my-services");
    revalidatePath("/my-services");
    revalidatePath("/services");
    revalidatePath("/allservices");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === "Failed to create listing.") {
      return { success: false, error: err.message };
    }
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
      return {
        success: false,
        error: "You can only delete your own listings.",
      };
    }

    const doomed = await db
      .select({ publicId: listingImages.publicId })
      .from(listingImages)
      .where(eq(listingImages.listingId, listingId));

    await db.delete(serviceListings).where(eq(serviceListings.id, listingId));

    for (const row of doomed) {
      if (row.publicId) void destroyAsset(row.publicId);
    }

    revalidatePath("/provider/my-services");
    revalidatePath("/my-services");
    revalidatePath("/services");
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
