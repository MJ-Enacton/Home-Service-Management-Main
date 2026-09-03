import Link from "next/link";
import { db } from "@/lib/db/db";
import { bookings, serviceListings, user } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  Users as UsersIcon,
  HardHat,
  Wrench,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldBan,
} from "lucide-react";

async function getCount(
  query: Promise<{ count: number }[]>,
): Promise<number> {
  const [row] = await query;
  return row?.count ?? 0;
}

export default async function AdminDashboardPage() {
  const [
    customerCount,
    providerCount,
    bannedCount,
    listingCount,
    totalBookings,
    requestedBookings,
    completedBookings,
    cancelledBookings,
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
        .from(user)
        .where(eq(user.banned, true)),
    ),
    getCount(db.select({ count: sql<number>`count(*)::int` }).from(serviceListings)),
    getCount(db.select({ count: sql<number>`count(*)::int` }).from(bookings)),
    getCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(eq(bookings.status, "requested")),
    ),
    getCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(eq(bookings.status, "completed")),
    ),
    getCount(
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(eq(bookings.status, "cancelled")),
    ),
  ]);

  const stats = [
    {
      label: "Customers",
      value: customerCount,
      icon: UsersIcon,
      href: "/admin/users",
    },
    {
      label: "Providers",
      value: providerCount,
      icon: HardHat,
      href: "/admin/providers",
    },
    {
      label: "Banned users",
      value: bannedCount,
      icon: ShieldBan,
      href: "/admin/users",
    },
    {
      label: "Listings",
      value: listingCount,
      icon: Wrench,
      href: "/admin/services",
    },
  ];

  const requests = [
    { label: "Total bookings", value: totalBookings, icon: ClipboardList },
    { label: "Awaiting approval", value: requestedBookings, icon: Clock },
    { label: "Completed", value: completedBookings, icon: CheckCircle2 },
    { label: "Cancelled", value: cancelledBookings, icon: XCircle },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-0">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform health at a glance — people, services and bookings.</p>
      </div>

      <section>
        <h2 className="mb-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">People & Services</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href} className="group">
              <div className="flex items-center gap-3 rounded-xl border bg-white p-4 transition hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700">
                <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  <stat.icon className="size-4" />
                </span>
                <div>
                  <p className="text-lg font-semibold leading-none">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Bookings</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {requests.map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800">
              <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <item.icon className="size-4" />
              </span>
              <div>
                <p className="text-lg font-semibold leading-none">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
