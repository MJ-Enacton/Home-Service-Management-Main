"use server";

import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import {
  bookings,
  bookingMessages,
  serviceListings,
  user,
} from "@/lib/db/schema";
import { emitToUser } from "@/lib/socket/emit";

const ACTIVE_STATUSES = ["confirmed", "in_progress"] as const;

export interface ChatSummary {
  bookingId: string;
  bookingNumber: string;
  status: "confirmed" | "in_progress";
  counterpartyName: string;
  listingTitle: string;
  scheduledDate: Date;
  scheduledTimeSlot: string;
  lastMessage: {
    body: string;
    createdAt: Date;
    isMine: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: Date;
  isMine: boolean;
}

/** Chat is allowed only while a job is accepted and not finished. */
async function assertActiveParticipant(bookingId: string, userId: string) {
  const [booking] = await db
    .select({
      id: bookings.id,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.id, bookingId),
        or(
          eq(bookings.customerId, userId),
          eq(bookings.providerId, userId),
        ),
        inArray(bookings.status, [...ACTIVE_STATUSES]),
      ),
    );
  return booking ?? null;
}

/** Active chats for the signed-in user (empty when anonymous). */
export async function getActiveChats(): Promise<ChatSummary[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return [];
  const userId = session.user.id;

  const providerUser = alias(user, "provider_user");
  const customerUser = alias(user, "customer_user");
  const rows = await db
    .select({
      bookingId: bookings.id,
      bookingNumber: bookings.bookingNumber,
      status: bookings.status,
      counterpartyName: sql<string>`case
        when ${bookings.customerId} = ${userId} then ${providerUser.name}
        else ${customerUser.name} end`,
      listingTitle: serviceListings.title,
      scheduledDate: bookings.scheduledDate,
      scheduledTimeSlot: bookings.scheduledTimeSlot,
    })
    .from(bookings)
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .innerJoin(providerUser, eq(bookings.providerId, providerUser.id))
    .innerJoin(customerUser, eq(bookings.customerId, customerUser.id))
    .where(
      and(
        or(
          eq(bookings.customerId, userId),
          eq(bookings.providerId, userId),
        ),
        inArray(bookings.status, [...ACTIVE_STATUSES]),
      ),
    )
    .orderBy(desc(bookings.updatedAt));

  const bookingIds = rows.map((row) => row.bookingId);
  if (bookingIds.length === 0) return [];

  // Latest message per chat + unread counts, fetched in bulk.
  const [lastMessages, unreads] = await Promise.all([
    db
      .select({
        bookingId: bookingMessages.bookingId,
        body: bookingMessages.body,
        createdAt: bookingMessages.createdAt,
        senderId: bookingMessages.senderId,
      })
      .from(bookingMessages)
      .where(inArray(bookingMessages.bookingId, bookingIds))
      .orderBy(desc(bookingMessages.createdAt))
      .limit(500),
    db
      .select({
        bookingId: bookingMessages.bookingId,
        count: sql<number>`count(*)::int`,
      })
      .from(bookingMessages)
      .where(
        and(
          inArray(bookingMessages.bookingId, bookingIds),
          ne(bookingMessages.senderId, userId),
          isNull(bookingMessages.readAt),
        ),
      )
      .groupBy(bookingMessages.bookingId),
  ]);

  const lastByBooking = new Map<string, (typeof lastMessages)[number]>();
  for (const message of lastMessages) {
    if (!lastByBooking.has(message.bookingId)) {
      lastByBooking.set(message.bookingId, message);
    }
  }
  const unreadByBooking = new Map(unreads.map((row) => [row.bookingId, row.count]));

  return rows.map((row) => ({
    ...row,
    status: row.status as "confirmed" | "in_progress",
    lastMessage: (() => {
      const last = lastByBooking.get(row.bookingId);
      if (!last) return null;
      return {
        body: last.body,
        createdAt: last.createdAt,
        isMine: last.senderId === userId,
      };
    })(),
    unreadCount: unreadByBooking.get(row.bookingId) ?? 0,
  }));
}

/** Thread for one booking; opening it marks counterpart messages read. */
export async function getChatMessages(
  bookingId: string,
): Promise<
  | { success: true; messages: ChatMessage[]; viewerName: string }
  | { success: false }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false };
  const userId = session.user.id;

  const booking = await assertActiveParticipant(bookingId, userId);
  if (!booking) return { success: false };

  const rows = await db
    .select({
      id: bookingMessages.id,
      body: bookingMessages.body,
      createdAt: bookingMessages.createdAt,
      senderId: bookingMessages.senderId,
    })
    .from(bookingMessages)
    .where(eq(bookingMessages.bookingId, bookingId))
    .orderBy(desc(bookingMessages.createdAt))
    .limit(50);

  await db
    .update(bookingMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(bookingMessages.bookingId, bookingId),
        ne(bookingMessages.senderId, userId),
        isNull(bookingMessages.readAt),
      ),
    );

  return {
    success: true,
    viewerName: session.user.name,
    messages: rows
      .reverse()
      .map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: row.createdAt,
        isMine: row.senderId === userId,
      })),
  };
}

export async function sendChatMessage(
  bookingId: string,
  body: string,
): Promise<
  | { success: true; message: ChatMessage }
  | { success: false; error?: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, error: "Not signed in." };
  const userId = session.user.id;

  const trimmed = body.trim().slice(0, 2000);
  if (!trimmed) {
    return { success: false, error: "Message cannot be empty." };
  }

  const booking = await assertActiveParticipant(bookingId, userId);
  if (!booking) {
    return {
      success: false,
      error: "Chat is only available while the job is active.",
    };
  }

  try {
    const [inserted] = await db
      .insert(bookingMessages)
      .values({
        bookingId,
        senderId: userId,
        body: trimmed,
      })
      .returning({
        id: bookingMessages.id,
        createdAt: bookingMessages.createdAt,
      });

    if (!inserted) {
      return { success: false, error: "Failed to send message." };
    }

    const counterpartyId =
      booking.customerId === userId ? booking.providerId : booking.customerId;

    emitToUser(counterpartyId, "chat:message", {
      id: inserted.id,
      bookingId,
      bookingNumber: booking.bookingNumber,
      body: trimmed,
      senderId: userId,
      senderName: session.user.name,
      createdAt: inserted.createdAt.toISOString(),
    });
    emitToUser(counterpartyId, "chat:refresh", {});

    return {
      success: true,
      message: {
        id: inserted.id,
        body: trimmed,
        createdAt: inserted.createdAt,
        isMine: true,
      },
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to send message." };
  }
}
