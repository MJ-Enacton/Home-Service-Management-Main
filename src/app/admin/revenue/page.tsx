import { desc, eq, sql } from "drizzle-orm";
import { Wallet, TrendingUp, ReceiptText } from "lucide-react";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/lib/db/db";
import { bookings, payments, serviceListings, user } from "@/lib/db/schema";
import { formatCents } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettleButton } from "./SettleButton";

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
  providerName: string;
  serviceFeeCents: number;
  providerPayoutCents: number | null;
  payoutSettledAt: Date | null;
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

  const providerUser = alias(user, "provider_user");
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
      providerName: providerUser.name,
      serviceFeeCents: bookings.serviceFee,
      providerPayoutCents: payments.providerPayout,
      payoutSettledAt: payments.payoutSettledAt,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .innerJoin(serviceListings, eq(bookings.listingId, serviceListings.id))
    .innerJoin(user, eq(bookings.customerId, user.id))
    .innerJoin(providerUser, eq(bookings.providerId, providerUser.id))
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
      <Card className="overflow-hidden">
        <div className="border-b px-5 py-4 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Payments collected through the platform.</p>
        </div>
        <div className="p-3 sm:p-4">

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="bg-cream dark:bg-zinc-800/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <card.icon className="size-5 text-primary" />
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
          <div className="rounded-xl border border-dashed bg-cream py-8 text-center text-sm text-muted-foreground dark:bg-zinc-800/60">
            No paid transactions yet.
          </div>
        ) : (
          <div className="space-y-2">
            {monthly.map((row) => (
              <div
                key={row.monthKey}
                className="flex items-center gap-4 rounded-xl border bg-cream px-4 py-3 dark:bg-zinc-800/60"
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
          <div className="rounded-xl border border-dashed bg-cream py-8 text-center text-sm text-muted-foreground dark:bg-zinc-800/60">
            Transactions will appear here once customers start booking.
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="divide-y bg-cream p-0 dark:bg-zinc-800/60">
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      Provider {payment.providerName}:{" "}
                      {payment.providerPayoutCents !== null
                        ? formatCents(payment.providerPayoutCents)
                        : "—"}{" "}
                      ·{" "}
                      {payment.payoutSettledAt ? (
                        <span className="font-medium text-green-700 dark:text-green-400">
                          settled
                        </span>
                      ) : (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          owed
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="capitalize">
                      {payment.method}
                    </Badge>
                    <span className="font-semibold">
                      {formatCents(payment.amountPaidCents)}
                    </span>
                    {payment.status === "paid" &&
                    payment.providerPayoutCents !== null &&
                    !payment.payoutSettledAt ? (
                      <SettleButton paymentId={payment.id} />
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
        </div>
      </Card>
    </div>
  );
}
