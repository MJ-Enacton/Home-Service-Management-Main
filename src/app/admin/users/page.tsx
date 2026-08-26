import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";
import type { AdminUser } from "@/types";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const users: AdminUser[] = await db
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
    .where(inArray(user.role, ["customer", "provider"]))
    .orderBy(desc(user.createdAt));

  return <AdminUsersClient users={users} />;
}
