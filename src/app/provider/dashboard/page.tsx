import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { bookings, listingImages, reviews, serviceListings } from "@/lib/db/schema";
import { user } from "@/lib/db/schema";
import { parseLocalDate } from "@/lib/format";
import {
  getProviderEarningsSeries,
  type EarningsRange,
} from "@/lib/db/queries/earnings";
import type { EarningsChartType } from "./EarningsChart";
import ProviderDashboardClient from "./ProviderDashboardClient";

export const dynamic = "force-dynamic";

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isThisWeek(date: Date) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return date >= monday && date <= sunday;
}

export default async function ProviderDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; view?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "provider") redirect("/");

  const providerId = session.user.id;

  // Chart filters live in the URL so refresh/back-button/shared links keep them.
  const params = await searchParams;
  const initialRange: EarningsRange =
    params?.range === "month" ? "month" : "week";
  const initialView: EarningsChartType =
    params?.view === "line" ? "line" : "bar";

  // Active listings
  const activeListings = await db
    .select({
      id: serviceListings.id,
      title: serviceListings.title,
      categoryId: serviceListings.categoryId,
    })
    .from(serviceListings)
    .where(
      and(
        eq(serviceListings.providerId, providerId),
        eq(serviceListings.status, "active"),
      ),
    );

  // All bookings for provider (for stats)
  const allBookings = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      totalAmount: bookings.totalAmount,
      scheduledDate: bookings.scheduledDate,
      bookingNumber: bookings.bookingNumber,
      listingId: bookings.listingId,
      requestedAt: bookings.requestedAt,
      completedAt: bookings.completedAt,
      isUrgent: bookings.isUrgent,
      streetAddress: bookings.streetAddress,
      customerId: bookings.customerId,
    })
    .from(bookings)
    .where(eq(bookings.providerId, providerId));

  // Reviews for avg rating
  const [ratingRow] = await db
    .select({
      avg: sql<number>`avg(${reviews.rating})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.providerId, providerId));

  const avgRating = ratingRow?.avg ? Math.round(ratingRow.avg * 10) / 10 : 0;
  const reviewCount = ratingRow?.count ?? 0;

  const totalRevenueCents = allBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  const jobsCompleted = allBookings.filter(
    (b) => b.status === "completed",
  ).length;

  const bookingsToday = allBookings.filter((b) =>
    isToday(parseLocalDate(b.scheduledDate)),
  ).length;
  const bookingsThisWeek = allBookings.filter((b) =>
    isThisWeek(parseLocalDate(b.scheduledDate)),
  ).length;

  // Earnings series for the chart (daily net, zero-filled), matching the URL filter.
  const earningsInitial = await getProviderEarningsSeries(
    providerId,
    initialRange,
  );

  // Upcoming bookings for "Recent requests" — show requested + confirmed (accepted), exclude cancelled/rejected/completed
  // Do not show rejected/cancelled; only upcoming that still need attention or are scheduled.
  const nowStart = new Date();
  nowStart.setHours(0, 0, 0, 0);
  const upcomingBookings = allBookings
    .filter(
      (b) =>
        (b.status === "requested" || b.status === "confirmed" || b.status === "in_progress") &&
        parseLocalDate(b.scheduledDate) >= nowStart,
    )
    .sort((a, b) => parseLocalDate(a.scheduledDate).getTime() - parseLocalDate(b.scheduledDate).getTime())
    .slice(0, 5);

  // Batched: listing titles + customer names for upcoming (fixes N+1)
  const listingIds = [...new Set(upcomingBookings.map((b) => b.listingId))];
  const customerIds = [...new Set(upcomingBookings.map((b) => b.customerId))];
  const [listingMapRows, customerMapRows] = await Promise.all([
    listingIds.length
      ? db.select({ id: serviceListings.id, title: serviceListings.title }).from(serviceListings).where(inArray(serviceListings.id, listingIds))
      : Promise.resolve([] as { id: string; title: string }[]),
    customerIds.length
      ? db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, customerIds))
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const listingTitleById = new Map(listingMapRows.map((r) => [r.id, r.title]));
  const customerNameById = new Map(customerMapRows.map((r) => [r.id, r.name]));
  const recentRequests = upcomingBookings.map((b) => ({
    id: b.id,
    bookingNumber: b.bookingNumber,
    listingTitle: listingTitleById.get(b.listingId) ?? "Service",
    customerName: customerNameById.get(b.customerId) ?? "Customer",
    totalAmount: b.totalAmount,
    scheduledDate: b.scheduledDate,
    isUrgent: b.isUrgent,
    location: b.streetAddress || "—",
    status: b.status as "requested" | "confirmed" | "in_progress",
  }));

  // Batched: avg rating per active listing (fixes N+1)
  const activeIds = activeListings.map((l) => l.id);
  const ratingRows = activeIds.length
    ? await db
        .select({ listingId: reviews.listingId, avg: sql<number>`avg(${reviews.rating})::float` })
        .from(reviews)
        .where(inArray(reviews.listingId, activeIds))
        .groupBy(reviews.listingId)
    : [];
  const avgByListingId = new Map(ratingRows.map((r) => [r.listingId, r.avg]));
  // Batched: cover image per active listing (first by display order).
  const coverRows = activeIds.length
    ? await db
        .select({
          listingId: listingImages.listingId,
          publicId: listingImages.publicId,
        })
        .from(listingImages)
        .where(
          and(
            inArray(listingImages.listingId, activeIds),
            isNotNull(listingImages.publicId),
          ),
        )
        .orderBy(asc(listingImages.displayOrder))
    : [];
  const coverByListingId = new Map<string, string>();
  for (const row of coverRows) {
    if (!coverByListingId.has(row.listingId) && row.publicId) {
      coverByListingId.set(row.listingId, row.publicId);
    }
  }
  const activeServicesStats = activeListings.map((listing) => {
    const listingBookings = allBookings.filter((b) => b.listingId === listing.id && b.status !== "cancelled");
    const revenue = listingBookings.filter((b) => b.status === "completed").reduce((s, b) => s + (b.totalAmount ?? 0), 0);
    const count = listingBookings.length;
    const avgRaw = avgByListingId.get(listing.id);
    const avg = avgRaw ? Math.round(avgRaw * 10) / 10 : 0;
    return { id: listing.id, title: listing.title, bookings: count, revenueCents: revenue, rating: avg, coverImagePublicId: coverByListingId.get(listing.id) ?? null };
  });

  const newRequestsCount = upcomingBookings.length;

  return (
    <ProviderDashboardClient
      providerName={session.user.name?.split(" ")[0] ?? "there"}
      profileImage={session.user.image ?? null}
      totalRevenueCents={totalRevenueCents}
      jobsCompleted={jobsCompleted}
      avgRating={avgRating}
      reviewCount={reviewCount}
      bookingsToday={bookingsToday}
      bookingsThisWeek={bookingsThisWeek}
      earningsInitial={earningsInitial}
      earningsRange={initialRange}
      earningsView={initialView}
      newRequestsCount={newRequestsCount}
      recentRequests={recentRequests}
      activeServices={activeServicesStats}
    />
  );
}
