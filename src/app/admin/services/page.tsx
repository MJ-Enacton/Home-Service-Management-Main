import { db } from "@/lib/db/db";
import { categories, serviceListings, user } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { AdminServicesClient } from "./AdminServicesClient";

export const dynamic = "force-dynamic";

export interface ModerationRow {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "inactive" | "draft";
  isVerified: boolean;
  basePriceCents: number;
  categoryName: string | null;
  providerName: string;
  updatedAt: Date;
}

export default async function AdminServicesPage() {
  const rows: ModerationRow[] = await db
    .select({
      id: serviceListings.id,
      title: serviceListings.title,
      description: serviceListings.description,
      status: serviceListings.status,
      isVerified: serviceListings.isVerified,
      basePriceCents: serviceListings.basePrice,
      categoryName: categories.name,
      providerName: user.name,
      updatedAt: serviceListings.updatedAt,
    })
    .from(serviceListings)
    .innerJoin(user, eq(serviceListings.providerId, user.id))
    .leftJoin(categories, eq(serviceListings.categoryId, categories.id))
    .orderBy(desc(serviceListings.updatedAt));

  return <AdminServicesClient listings={rows} />;
}
