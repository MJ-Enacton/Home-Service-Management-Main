import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { bookings, notifications, reviews } from "@/lib/db/schema";
import { resolveRole } from "@/lib/roles";
import { NotificationsClient } from "@/app/notifications/NotificationsClient";

export default async function ProviderNotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "provider") redirect("/");
  const items = await db.select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message, bookingId: notifications.bookingId, bookingStatus: bookings.status, reviewed: sql<boolean>`${reviews.bookingId} is not null`.as("reviewed"), readAt: notifications.readAt, archivedAt: notifications.archivedAt, createdAt: notifications.createdAt }).from(notifications).leftJoin(bookings, eq(notifications.bookingId, bookings.id)).leftJoin(reviews, eq(reviews.bookingId, notifications.bookingId)).where(eq(notifications.userId, session.user.id)).orderBy(desc(notifications.createdAt));
  return <NotificationsClient notifications={items} role={resolveRole(session.user.role)} />;
}
