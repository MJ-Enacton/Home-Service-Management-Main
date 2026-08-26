import { db } from "@/lib/db/db";
import { serviceListings, user } from "@/lib/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import type { AdminUser } from "@/types";
import { AdminProvidersClient } from "./AdminProvidersClient";

export interface ProviderWithServices extends AdminUser {
  serviceList: { id: string; name: string; description: string | null }[];
}

export default async function AdminProvidersPage() {
  const providers: AdminUser[] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      contact: user.contact,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      bannedAt: user.bannedAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, "provider"))
    .orderBy(desc(user.createdAt));

  const listings = await db
    .select({
      providerId: serviceListings.providerId,
      id: serviceListings.id,
      name: serviceListings.title,
      description: serviceListings.description,
    })
    .from(serviceListings)
    .where(
      providers.length > 0
        ? inArray(
            serviceListings.providerId,
            providers.map((provider) => provider.id),
          )
        : undefined,
    )
    .orderBy(asc(serviceListings.title));

  const rows: ProviderWithServices[] = providers.map((provider) => ({
    ...provider,
    serviceList: listings
      .filter((listing) => listing.providerId === provider.id)
      .map(({ id, name, description }) => ({ id, name, description })),
  }));

  return <AdminProvidersClient providers={rows} />;
}
