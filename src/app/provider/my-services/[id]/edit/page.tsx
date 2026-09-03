import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import {
  listingImages,
  serviceListings,
  serviceTiers,
} from "@/lib/db/schema";
import { listCategories } from "@/lib/db/queries/categories";
import { ListingEditor } from "../../ListingEditor";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }
  if (session.user.role !== "provider") {
    redirect("/");
  }

  const { id } = await params;

  const [listing] = await db
    .select()
    .from(serviceListings)
    .where(eq(serviceListings.id, id));

  if (!listing || listing.providerId !== session.user.id) {
    notFound();
  }

  const [categoryRows, tiers, images] = await Promise.all([
    listCategories(),
    db
      .select({
        id: serviceTiers.id,
        name: serviceTiers.name,
        description: serviceTiers.description,
        priceCents: serviceTiers.price,
      })
      .from(serviceTiers)
      .where(eq(serviceTiers.listingId, id))
      .orderBy(asc(serviceTiers.displayOrder)),
    db
      .select({ id: listingImages.id })
      .from(listingImages)
      .where(eq(listingImages.listingId, id)),
  ]);

  const categorySlug =
    categoryRows.find(
      (category) =>
        category.id ===
        // categoryId is a uuid string on the row
        listing.categoryId,
    )?.slug ??
    categoryRows[0]?.slug ??
    "";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <div className="mb-8 border-b bg-muted/40 -mx-4 px-4 py-8 md:-mx-6 md:px-6">
        <p className="text-sm text-muted-foreground">
          Account <span className="mx-1 text-border">/</span> My Services{" "}
          <span className="mx-1 text-border">/</span>{" "}
          <span className="font-medium text-foreground">Edit</span>
        </p>
        <h1 className="mt-1 truncate text-3xl font-bold tracking-tight md:text-4xl">
          {listing.title}
        </h1>
      </div>

      <ListingEditor
        categories={categoryRows.map(({ slug, name }) => ({ slug, name }))}
        initial={{
          id: listing.id,
          title: listing.title,
          description: listing.description ?? "",
          categorySlug,
          pricingType: listing.pricingType,
          basePriceCents: listing.basePrice,
          location: listing.location ?? "",
          estimatedDuration: listing.estimatedDuration ?? "",
          tags: Array.isArray(listing.tags) ? listing.tags : [],
          status: listing.status,
          tiers,
          imageCount: images.length,
        }}
      />
    </main>
  );
}
