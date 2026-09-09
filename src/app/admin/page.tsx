import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { serviceListings, user } from "@/lib/db/schema";
import {
  getAdminRevenueSeries,
  getAdminBookingsStatusSeries,
  getAdminUserGrowthSeries,
  type AdminRange,
} from "@/lib/db/queries/admin-stats";
import { AdminRevenueChart } from "./AdminRevenueChart";
import { AdminBookingsStatusChart } from "./AdminBookingsStatusChart";
import { AdminUserGrowthChart } from "./AdminUserGrowthChart";
import Link from "next/link";

async function getCount(query: Promise<{ count: number }[]>): Promise<number> {
  const [row] = await query;
  return row?.count ?? 0;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    revenueRange?: string;
    revenueView?: string;
    bookingsRange?: string;
    bookingsView?: string;
    growthRange?: string;
    growthView?: string;
  }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/");

  const params = await searchParams;

  // Chart filters live in the URL so refresh/back-button/shared links keep them.
  const revenueRange: AdminRange =
    params?.revenueRange === "month" ? "month" : "week";
  const revenueView = params?.revenueView === "line" ? "line" : "bar";
  const bookingsRange: AdminRange =
    params?.bookingsRange === "month" ? "month" : "week";
  const bookingsView = params?.bookingsView === "line" ? "line" : "bar";
  const growthRange: AdminRange =
    params?.growthRange === "month" ? "month" : "week";
  const growthView = params?.growthView === "line" ? "line" : "bar";

  // Parallel fetches: KPIs + initial chart series
  const [
    customerCount,
    providerCount,
    pendingListings,
    revenueWeek,
    bookingsStatusWeek,
    userGrowthWeek,
  ] = await Promise.all([
    getCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
        .where(eq(user.role, "customer")),
    ),
    getCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
        .where(eq(user.role, "provider")),
    ),
    getCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(serviceListings)
        .where(eq(serviceListings.status, "pending")),
    ),
    getAdminRevenueSeries(revenueRange),
    getAdminBookingsStatusSeries(bookingsRange),
    getAdminUserGrowthSeries(growthRange),
  ]);

  const totalUsers = customerCount + providerCount;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 md:px-6 md:pt-8">
      <div className="rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
        <div className="border-b px-5 py-4 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform health at a glance — revenue, bookings, users.
          </p>
        </div>
        <div className="p-3 sm:p-4">
          {/* KPI Row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Link
              href="/admin/customers"
              className="group flex items-center gap-3 rounded-xl border bg-cream p-4 transition hover:border-zinc-300 dark:bg-zinc-800/60 dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1h0M12 21v-1a6 6 0 00-6-6H3v1M12 21v-1a6 6 0 016-6h0v1M12 21v-1a6 6 0 006-6h0v1"
                  />
                </svg>
              </span>
              <div>
                <p className="text-lg font-semibold leading-none">
                  {customerCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Customers</p>
              </div>
            </Link>
            <Link
              href="/admin/providers"
              className="group flex items-center gap-3 rounded-xl border bg-cream p-4 transition hover:border-zinc-300 dark:bg-zinc-800/60 dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </span>
              <div>
                <p className="text-lg font-semibold leading-none">
                  {providerCount}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Providers</p>
              </div>
            </Link>
            <Link
              href="/admin/bookings"
              className="group flex items-center gap-3 rounded-xl border bg-cream p-4 transition hover:border-zinc-300 dark:bg-zinc-800/60 dark:border-zinc-700 dark:hover:border-zinc-600"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </span>
              <div>
                <p className="text-lg font-semibold leading-none">
                  Total Users
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {totalUsers}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-3 rounded-xl border bg-cream p-4 dark:bg-zinc-800/60 dark:border-zinc-700">
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </span>
              <div>
                <p className="text-lg font-semibold leading-none">
                  Pending Listings
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingListings}
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <AdminRevenueChart
            initialPoints={revenueWeek}
            initialRange={revenueRange}
            initialView={revenueView}
          />

          {/* Row: Bookings Status + User Growth */}
          <div className="grid gap-4 lg:grid-cols-2 mt-6">
            <AdminBookingsStatusChart
              initialPoints={bookingsStatusWeek}
              initialRange={bookingsRange}
              initialView={bookingsView}
            />
            <AdminUserGrowthChart
              initialPoints={userGrowthWeek}
              initialRange={growthRange}
              initialView={growthView}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
