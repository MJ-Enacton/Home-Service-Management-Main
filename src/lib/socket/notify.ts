import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { notifications } from "@/lib/db/schema";
import { emitToUser } from "./emit";

export interface NewRequestEvent {
  /** notification id */
  id: string;
  bookingId: string;
  bookingNumber: string;
  message: string;
  listingTitle: string;
  customerName: string;
  createdAt: string;
  type?: string;
}

export interface BookingUpdatedEvent {
  bookingId: string;
  bookingNumber: string;
  status: "confirmed" | "in_progress" | "completed" | "cancelled";
}

/** @deprecated legacy request-centric payload — kept until all clients migrate */
export type RequestUpdatedEvent = never;

export async function pushUnreadCount(userId: string): Promise<void> {
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      );

    emitToUser(userId, "unread:count", { count: row?.count ?? 0 });
  } catch (err) {
    console.error("[socket] Failed to push unread count:", err);
  }
}
