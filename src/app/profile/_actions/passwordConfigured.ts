import { db } from "@/lib/db/db";
import { account } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function hasPassword(userId: string) {
  const userHasPassword = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    );

  return userHasPassword.length > 0;
}
