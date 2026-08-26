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

import { Card, CardContent } from "@/components/ui/card";

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
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your platform at a glance.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
          People &amp; Services
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:border-blue-300 dark:hover:border-blue-800">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/50">
                    <stat.icon className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
          Bookings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {requests.map((item) => (
            <Card key={item.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg bg-zinc-100 p-2.5 dark:bg-zinc-800">
                  <item.icon className="size-5 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
