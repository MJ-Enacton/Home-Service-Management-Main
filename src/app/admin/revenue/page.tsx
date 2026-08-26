import { desc, eq, sql } from "drizzle-orm";
import { Wallet, TrendingUp, ReceiptText } from "lucide-react";

import { db } from "@/lib/db/db";
import { bookings, payments, serviceListings, user } from "@/lib/db/schema";
import { formatCents } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface RecentPayment {
  id: string;
  amountPaidCents: number;
  method: string;
  status: string;
  paidAt: Date | null;
  bookingNumber: string;
  listingTitle: string;
  customerName: string;
  serviceFeeCents: number;
}

export default async function AdminRevenuePage() {
  const [totalsRow] = await db
    .select({
      grossPaid: sql<number>`coalesce(sum(${payments.amountPaid}), 0)::int`,
      transactionCount: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(eq(payments.status, "paid"));

  const [feesRow] = await db
    .select({
      serviceFees: sql<number>`coalesce(sum(${bookings.serviceFee}), 0)::int`,
      taxCollected: sql<number>`coalesce(sum(${bookings.taxAmount}), 0)::int`,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(eq(payments.status, "paid"));

  const monthly = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${payments.paidAt}), 'Mon YYYY')`,
      monthKey: sql<string>`date_trunc('month', ${payments.paidAt})`,
      gross: sql<number>`sum(${payments.amountPaid})::int`,
    })
    .from(payments)
    .where(eq(payments.status, "paid"))
    .groupBy(sql`date_trunc('month', ${payments.paidAt})`)
    .orderBy(desc(sql`date_trunc('month', ${payments.paidAt})`))
    .limit(6);

  const recentPayments: RecentPayment[] = await db
    .select({
      id: payments.id,
      amountPaidCents: payments.amountPaid,
      method: payments.method,
      status: payments.status,
      paidAt: payments.paidAt,
      bookingNumber: bookings.bookingNumber,
      listingTitle: serviceListings.title,
      customerName: user.name,
      serviceFeeCents: bookings.serviceFee,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .innerJoin(user, eq(bookings.customerId, user.id))
    .orderBy(desc(payments.createdAt))
    .limit(15);

  const gross = totalsRow?.grossPaid ?? 0;
  const fees = feesRow?.serviceFees ?? 0;
  const tax = feesRow?.taxCollected ?? 0;
  const payouts = Math.max(0, gross - fees - tax);
  const maxMonthGross = Math.max(1, ...monthly.map((m) => m.gross));

  const summaryCards = [
    {
      label: "Gross volume (paid)",
      value: formatCents(gross),
      icon: Wallet,
      hint: `${totalsRow?.transactionCount ?? 0} transactions`,
    },
    {
      label: "Platform fees",
      value: formatCents(fees),
      icon: TrendingUp,
      hint: "10% service fee on completed checkouts",
    },
    {
      label: "Provider payouts",
      value: formatCents(payouts),
      icon: ReceiptText,
      hint: tax > 0 ? `plus ${formatCents(tax)} tax collected` : "net of platform fees",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payments collected through the platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950/50">
                  <card.icon className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-2xl font-semibold">{card.value}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly trend */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
          Last months
        </h2>
        {monthly.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No paid transactions yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {monthly.map((row) => (
              <div
                key={row.monthKey}
                className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3"
              >
                <span className="w-24 shrink-0 text-sm font-medium">
                  {row.month}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.max(4, Math.round((row.gross / maxMonthGross) * 100))}%`,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-semibold">
                  {formatCents(row.gross)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase">
          Recent transactions
        </h2>
        {recentPayments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Transactions will appear here once customers start booking.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{payment.listingTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.bookingNumber} · {payment.customerName} ·{" "}
                      {payment.paidAt
                        ? payment.paidAt.toLocaleDateString("en-IN", {
                            dateStyle: "medium",
                          })
                        : "pending capture"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="capitalize">
                      {payment.method}
                    </Badge>
                    <span className="font-semibold">
                      {formatCents(payment.amountPaidCents)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
