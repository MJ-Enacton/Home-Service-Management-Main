import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";
import {
  categories,
  listingImages,
  serviceListings,
} from "@/lib/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function imageResponse(imageData: string, mime: string | null) {
  const buffer = Buffer.from(imageData, "base64");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime ?? "image/jpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

/**
 * Serves gallery images for a service listing.
 * `?i=n` selects the n-th gallery image (display order); when the listing has
 * no images of its own, falls back to the category's master image.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const index = Math.max(
    0,
    Number.parseInt(new URL(request.url).searchParams.get("i") ?? "0", 10) || 0,
  );

  const [listing] = await db
    .select({ categoryId: serviceListings.categoryId })
    .from(serviceListings)
    .where(eq(serviceListings.id, id));

  const images = await db
    .select({
      imageData: listingImages.imageData,
      imageMime: listingImages.imageMime,
    })
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(asc(listingImages.displayOrder), asc(listingImages.createdAt));

  const picked = images[index];
  if (picked) {
    return imageResponse(picked.imageData, picked.imageMime);
  }

  if (index === 0 && listing?.categoryId) {
    const [category] = await db
      .select({
        imageData: categories.imageData,
        imageMime: categories.imageMime,
      })
      .from(categories)
      .where(eq(categories.id, listing.categoryId));

    if (category?.imageData) {
      return imageResponse(category.imageData, category.imageMime);
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
