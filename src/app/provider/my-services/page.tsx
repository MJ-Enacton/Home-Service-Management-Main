import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { categories, serviceListings } from "@/lib/db/schema";
import type { ServiceListing } from "@/types";
import { MyServicesClient } from "./MyServicesClient";

export interface MyListingRow extends ServiceListing {
  categoryName: string | null;
}

export default async function MyServicesPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.role !== "provider") {
    redirect("/");
  }

  const myServices: MyListingRow[] = await db
    .select({
      id: serviceListings.id,
      providerId: serviceListings.providerId,
      categoryId: serviceListings.categoryId,
      title: serviceListings.title,
      description: serviceListings.description,
      pricingType: serviceListings.pricingType,
      basePrice: serviceListings.basePrice,
      status: serviceListings.status,
      location: serviceListings.location,
      estimatedDuration: serviceListings.estimatedDuration,
      tags: serviceListings.tags,
      createdAt: serviceListings.createdAt,
      updatedAt: serviceListings.updatedAt,
      categoryName: categories.name,
    })
    .from(serviceListings)
    .leftJoin(categories, eq(serviceListings.categoryId, categories.id))
    .where(eq(serviceListings.providerId, session.user.id))
    .orderBy(desc(serviceListings.updatedAt));

  return <MyServicesClient listings={myServices} />;
}
