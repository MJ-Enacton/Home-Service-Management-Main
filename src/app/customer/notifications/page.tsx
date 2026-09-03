import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { bookings, notifications } from "@/lib/db/schema";
import { resolveRole } from "@/lib/roles";
import { NotificationsClient } from "@/app/notifications/NotificationsClient";

export default async function CustomerNotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "customer") redirect("/");
  const items = await db.select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message, bookingId: notifications.bookingId, bookingStatus: bookings.status, readAt: notifications.readAt, archivedAt: notifications.archivedAt, createdAt: notifications.createdAt }).from(notifications).leftJoin(bookings, eq(notifications.bookingId, bookings.id)).where(eq(notifications.userId, session.user.id)).orderBy(desc(notifications.createdAt));
  return <NotificationsClient notifications={items} role={resolveRole(session.user.role)} />;
}
