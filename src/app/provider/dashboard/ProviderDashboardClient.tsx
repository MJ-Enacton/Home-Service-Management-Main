/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  DollarSign,
  CalendarDays,
  CalendarCheck,
  Star,
  Plus,
  Calendar,
  Hammer,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/format";

interface RecentRequest {
  id: string;
  bookingNumber: string;
  listingTitle: string;
  customerName: string;
  totalAmount: number;
  scheduledDate: string;
  isUrgent: boolean;
  location: string;
  status: "requested" | "confirmed" | "in_progress";
}

interface ActiveService {
  id: string;
  title: string;
  bookings: number;
  revenueCents: number;
  rating: number;
}

export default function ProviderDashboardClient({
  providerName,
  profileImage,
  totalRevenueCents,
  jobsCompleted,
  avgRating,
  reviewCount,
  bookingsToday,
  bookingsThisWeek,
  earningsLast7Days,
  newRequestsCount,
  recentRequests,
  activeServices,
}: {
  providerName: string;
  profileImage: string | null;
  totalRevenueCents: number;
  jobsCompleted: number;
  avgRating: number;
  reviewCount: number;
  bookingsToday: number;
  bookingsThisWeek: number;
  earningsLast7Days: { label: string; cents: number; date: string }[];
  newRequestsCount: number;
  recentRequests: RecentRequest[];
  activeServices: ActiveService[];
}) {
  return (
    <main className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header — warm, premium, not a copy */}
      <section className="relative overflow-hidden border-b bg-white dark:bg-zinc-900">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-50 via-white to-indigo-50/60 dark:from-blue-950/20 dark:via-zinc-900 dark:to-indigo-950/20" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6 md:py-10">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={providerName}
                  className="size-14 rounded-2xl object-cover shadow-sm ring-1 ring-black/5"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-bold text-white shadow-sm dark:bg-white dark:text-zinc-900">
                  {providerName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-[26px] font-bold tracking-tight">
                  Welcome back, {providerName}
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Here&apos;s what&apos;s happening with your services today —
                  track revenue, bookings and requests in one place.
                </p>
              </div>
            </div>
            {newRequestsCount > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <span className="size-2 rounded-full bg-amber-500" />
                {newRequestsCount} new request
                {newRequestsCount === 1 ? "" : "s"} awaiting action
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/provider/my-services/new">
              <Button
                size="lg"
                className="rounded-full bg-blue-600 px-6 shadow-sm hover:bg-blue-700"
              >
                <Plus className="size-4" />
                Add a service
              </Button>
            </Link>
            <Link href="/provider/my-bookings">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full bg-white px-6"
              >
                <Calendar className="size-4" />
                View schedule
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        {/* KPI — project-covered only: revenue, today/week bookings, rating/jobs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/10">
                  <DollarSign className="size-4" />
                </span>
                <Badge
                  variant="secondary"
                  className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-white dark:text-zinc-900"
                >
                  Total
                </Badge>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total revenue
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {formatCents(totalRevenueCents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {jobsCompleted} job{jobsCompleted === 1 ? "" : "s"} completed ·{" "}
                {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                  <CalendarCheck className="size-4" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Today
                </span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bookings for today
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {bookingsToday}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bookingsToday === 0
                  ? "No bookings scheduled"
                  : "Scheduled & awaiting"}{" "}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/30">
                  <CalendarDays className="size-4" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  This week
                </span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bookings this week
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {bookingsThisWeek}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mon–Sun · includes today
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30">
                  <Star className="size-4" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {reviewCount} reviews
                </span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Avg. rating
              </p>
              <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                {avgRating > 0 && (
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {avgRating > 0 ? "Based on completed jobs" : "No ratings yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Middle: earnings (empty) + recent requests */}
        <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Earnings overview</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Daily earnings for the last 7 days
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  Last 7 days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Empty chart placeholder — as requested */}
              <div className="flex h-47.5 flex-col items-center justify-center rounded-xl border border-dashed bg-zinc-50/60 px-6 text-center dark:bg-zinc-900/40">
                <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-800">
                  <DollarSign className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-semibold">Chart coming soon</p>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Your earnings visualization will appear here once data is
                  available. For now use the KPI cards above.
                </p>
              </div>
              <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
                {earningsLast7Days.slice(0, 3).map((d) => (
                  <span key={d.date} className="hidden sm:inline">
                    {d.label}: {formatCents(d.cents, { withCents: false })}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming bookings</CardTitle>
                <Badge variant="secondary" className="rounded-full">
                  {newRequestsCount} upcoming
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Accepted and pending — rejected bookings are hidden
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {recentRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-zinc-50/60 p-8 text-center dark:bg-zinc-900/30">
                  <CheckCircle2 className="mx-auto size-6 text-emerald-500" />
                  <p className="mt-2 text-sm font-semibold">
                    No upcoming bookings
                  </p>
                  <p className="mx-auto mt-1 max-w-[26ch] text-xs leading-relaxed text-muted-foreground">
                    No pending or accepted bookings scheduled. Rejected bookings
                    are not shown.
                  </p>
                  <Link
                    href="/provider/my-bookings"
                    className="mt-4 inline-flex text-xs font-medium text-blue-600 hover:underline"
                  >
                    Go to bookings <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentRequests.map((r) => (
                    <div
                      key={r.id}
                      className="flex gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
                        {r.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {r.customerName}
                          </p>
                          <span className="shrink-0 text-sm font-semibold">
                            {formatCents(r.totalAmount, { withCents: false })}
                          </span>
                        </div>
                        <p className="truncate text-xs font-medium text-blue-600">
                          {r.listingTitle}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {new Date(r.scheduledDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            {r.location}
                          </span>
                          {r.isUrgent && (
                            <Badge className="h-5 bg-orange-500 px-2 text-[10px] text-white">
                              Urgent
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`h-5 rounded-full px-2 text-[10px] capitalize ${r.status === "confirmed" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : r.status === "in_progress" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                          >
                            {r.status === "confirmed"
                              ? "Accepted"
                              : r.status === "in_progress"
                                ? "In progress"
                                : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {recentRequests.length > 0 && (
                <Link
                  href="/provider/my-bookings"
                  className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border bg-white py-2.5 text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900"
                >
                  View all bookings <ChevronRight className="size-4" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active services */}
        <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Your active services</CardTitle>
              <p className="text-xs text-muted-foreground">
                {activeServices.length === 0
                  ? "No active services yet"
                  : `${activeServices.length} service${activeServices.length === 1 ? "" : "s"} visible to customers`}
              </p>
            </div>
            <Link
              href="/provider/my-services"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
            >
              Manage <ChevronRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {activeServices.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-zinc-50/60 p-8 text-center dark:bg-zinc-900/30">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-800">
                  <Hammer className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-semibold">No active services</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Create your first service to start receiving bookings. You can
                  have up to 5 active services.
                </p>
                <Link href="/provider/my-services/new" className="mt-4 inline-flex">
                  <Button className="rounded-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="size-4" /> Add a service
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeServices.map((s) => (
                  <div
                    key={s.id}
                    className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md dark:bg-zinc-900"
                  >
                    <div className="relative h-28 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      <img
                        src={`/api/services/${s.id}/image`}
                        alt={s.title}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/15 to-transparent" />
                      {s.rating > 0 && (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold shadow">
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          {s.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="p-3.5">
                      <h3 className="line-clamp-1 text-sm font-semibold">
                        {s.title}
                      </h3>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Bookings
                          </p>
                          <p className="text-sm font-bold">{s.bookings}</p>
                        </div>
                        <div className="rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Revenue
                          </p>
                          <p className="text-sm font-bold">
                            {formatCents(s.revenueCents, { withCents: false })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-xs dark:border-zinc-800">
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                          <span className="size-1.5 rounded-full bg-emerald-500" />{" "}
                          Active
                        </span>
                        <Link
                          href={`/provider/my-services/${s.id}/edit`}
                          className="font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
