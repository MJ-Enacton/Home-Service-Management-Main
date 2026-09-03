"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/db";
import { notifications, serviceListings } from "@/lib/db/schema";
import type { ActionResult } from "@/types";
import { emitToUser } from "@/lib/socket/emit";
import { pushUnreadCount } from "@/lib/socket/notify";

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; result: ActionResult }
> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (session.user.role !== "admin") {
    return {
      ok: false,
      result: { success: false, error: "Only admins can perform this action." },
    };
  }

  return { ok: true, userId: session.user.id };
}

export async function setListingStatus(
  listingId: string,
  status: "active" | "inactive" | "draft" | "pending" | "rejected",
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  try {
    // Enforce max 5 active per provider when activating.
    if (status === "active") {
      const [existing] = await db
        .select({
          providerId: serviceListings.providerId,
          currentStatus: serviceListings.status,
        })
        .from(serviceListings)
        .where(eq(serviceListings.id, listingId));
      if (existing && existing.currentStatus !== "active") {
        const [activeCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(serviceListings)
          .where(
            and(
              eq(serviceListings.providerId, existing.providerId),
              eq(serviceListings.status, "active"),
            ),
          );
        if ((activeCount?.count ?? 0) >= 5) {
          return {
            success: false,
            error:
              "This provider already has 5 active services. Deactivate another service before activating this one.",
          };
        }
      }
    }

    const [listing] = await db
      .update(serviceListings)
      .set({ status })
      .where(eq(serviceListings.id, listingId))
      .returning({
        providerId: serviceListings.providerId,
        title: serviceListings.title,
      });

    if (listing) {
      const statusMessages: Record<
        typeof status,
        { title: string; message: string }
      > = {
        active: {
          title: "Service Activated",
          message: `Your service "${listing.title}" has been activated by an administrator and is now visible to customers.`,
        },
        inactive: {
          title: "Service Deactivated",
          message: `Your service "${listing.title}" has been deactivated by an administrator and is no longer visible to customers.`,
        },
        draft: {
          title: "Service Moved to Draft",
          message: `Your service "${listing.title}" has been moved to draft by an administrator.`,
        },
        pending: {
          title: "Service Pending Review",
          message: `Your service "${listing.title}" is now pending review by an administrator.`,
        },
        rejected: {
          title: "Service Rejected",
          message: `Your proposed service "${listing.title}" has been rejected by an administrator.`,
        },
      };

      const { title, message } = statusMessages[status];
      const notificationId = crypto.randomUUID();

      await db.insert(notifications).values({
        id: notificationId,
        userId: listing.providerId,
        type: "system",
        title,
        message,
      });

      emitToUser(listing.providerId, "notification:new", {
        id: notificationId,
        type: "system",
        title,
        message,
        bookingId: null,
        listingId,
        status,
        createdAt: new Date().toISOString(),
      });
      emitToUser(listing.providerId, "listing:updated", {
        listingId,
        status,
        title: listing.title,
      });
      void pushUnreadCount(listing.providerId);
    }

    revalidatePath("/admin/services");
    revalidatePath("/allservices");
    revalidatePath("/my-services");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to update listing status." };
  }
}

export async function approveListing(listingId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  try {
    const [precheck] = await db
      .select({
        providerId: serviceListings.providerId,
        currentStatus: serviceListings.status,
      })
      .from(serviceListings)
      .where(eq(serviceListings.id, listingId));
    if (precheck && precheck.currentStatus !== "active") {
      const [activeCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(serviceListings)
        .where(
          and(
            eq(serviceListings.providerId, precheck.providerId),
            eq(serviceListings.status, "active"),
          ),
        );
      if ((activeCount?.count ?? 0) >= 5) {
        return {
          success: false,
          error:
            "This provider already has 5 active services. Deactivate another service before approving this one.",
        };
      }
    }

    const [listing] = await db
      .update(serviceListings)
      .set({ status: "active" })
      .where(eq(serviceListings.id, listingId))
      .returning({
        providerId: serviceListings.providerId,
        title: serviceListings.title,
      });

    if (listing) {
      const notificationId = crypto.randomUUID();
      const title = "Service Approved";
      const message = `Your proposed service "${listing.title}" has been approved and is now active.`;

      await db.insert(notifications).values({
        id: notificationId,
        userId: listing.providerId,
        type: "system",
        title,
        message,
      });

      emitToUser(listing.providerId, "notification:new", {
        id: notificationId,
        type: "system",
        title,
        message,
        bookingId: null,
        listingId,
        status: "active",
        createdAt: new Date().toISOString(),
      });
      emitToUser(listing.providerId, "listing:updated", {
        listingId,
        status: "active",
        title: listing.title,
      });
      void pushUnreadCount(listing.providerId);
    }

    revalidatePath("/admin/services");
    revalidatePath("/my-services");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to approve listing." };
  }
}

export async function rejectListing(listingId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.result;

  try {
    const [listing] = await db
      .update(serviceListings)
      .set({ status: "rejected" })
      .where(eq(serviceListings.id, listingId))
      .returning({
        providerId: serviceListings.providerId,
        title: serviceListings.title,
      });

    if (listing) {
      const notificationId = crypto.randomUUID();
      const title = "Service Rejected";
      const message = `Your proposed service "${listing.title}" has been rejected by an administrator.`;

      await db.insert(notifications).values({
        id: notificationId,
        userId: listing.providerId,
        type: "system",
        title,
        message,
      });

      emitToUser(listing.providerId, "notification:new", {
        id: notificationId,
        type: "system",
        title,
        message,
        bookingId: null,
        listingId,
        status: "rejected",
        createdAt: new Date().toISOString(),
      });
      emitToUser(listing.providerId, "listing:updated", {
        listingId,
        status: "rejected",
        title: listing.title,
      });
      void pushUnreadCount(listing.providerId);
    }

    revalidatePath("/admin/services");
    revalidatePath("/my-services");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to reject listing." };
  }
}
