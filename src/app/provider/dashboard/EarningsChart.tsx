"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, ChartLine, DollarSign } from "lucide-react";

import type {
  EarningsPoint,
  EarningsRange,
} from "@/lib/db/queries/earnings";
import { getEarningsSeries } from "./actions";
import { formatCents } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type EarningsChartType = "bar" | "line";

const chartConfig = {
  netCents: {
    label: "Net earnings",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

/** Compact axis ticks: ₹800, ₹12k, ₹1.2L */
function compactRupees(cents: number): string {
  const rupees = cents / 100;
  if (rupees >= 100000) {
    const lakh = rupees / 100000;
    return `₹${Number.isInteger(lakh) ? lakh : lakh.toFixed(1)}L`;
  }
  if (rupees >= 1000) {
    const k = rupees / 1000;
    return `₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `₹${Math.round(rupees)}`;
}

export function EarningsChart({
  initialPoints,
  initialRange,
  initialView,
}: {
  initialPoints: EarningsPoint[];
  initialRange: EarningsRange;
  initialView: EarningsChartType;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [range, setRange] = useState<EarningsRange>(initialRange);
  const [chartType, setChartType] = useState<EarningsChartType>(initialView);
  const [points, setPoints] = useState<EarningsPoint[]>(initialPoints);
  const [isPending, startTransition] = useTransition();

  const totalNet = useMemo(
    () => points.reduce((sum, p) => sum + p.netCents, 0),
    [points],
  );
  const isEmpty = totalNet === 0;

  /** Persist filters in the URL (?range=month&view=line) so refresh, back/forward and shared links keep them. */
  function syncUrl(nextRange: EarningsRange, nextView: EarningsChartType) {
    const params = new URLSearchParams();
    if (nextRange !== "week") params.set("range", nextRange);
    if (nextView !== "line") params.set("view", nextView);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleRange(next: EarningsRange) {
    if (next === range || isPending) return;
    setRange(next);
    syncUrl(next, chartType);
    startTransition(async () => {
      const result = await getEarningsSeries(next);
      if (result.success) setPoints(result.points);
    });
  }

  function handleChartType(next: EarningsChartType) {
    if (next === chartType) return;
    setChartType(next);
    syncUrl(range, next);
  }

  const sharedAxes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={range === "month" ? 20 : 0}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={52}
        tickFormatter={(value: number) => compactRupees(value)}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            formatter={(value) => formatCents(Number(value))}
          />
        }
      />
    </>
  );

  return (
    <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Earnings overview</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {range === "week"
                ? "Daily net earnings · Mon–Sun"
                : "Daily net earnings · this month"}{" "}
              · {formatCents(totalNet, { withCents: false })} total
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Range filter */}
            <div
              className="inline-flex rounded-full border bg-white p-0.5 dark:bg-zinc-900"
              role="tablist"
              aria-label="Earnings range"
            >
              {(["week", "month"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={range === value}
                  disabled={isPending}
                  onClick={() => handleRange(value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-60",
                    range === value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {value === "week" ? "This week" : "This month"}
                </button>
              ))}
            </div>
            {/* Chart-type filter */}
            <div
              className="inline-flex rounded-full border bg-white p-0.5 dark:bg-zinc-900"
              role="tablist"
              aria-label="Chart type"
            >
              {(
                [
                  { value: "bar", label: "Bar", icon: BarChart3 },
                  { value: "line", label: "Line", icon: ChartLine },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={chartType === option.value}
                  onClick={() => handleChartType(option.value)}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                    chartType === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <option.icon className="size-3.5" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-[260px] flex-col items-center justify-center rounded-xl border border-dashed bg-zinc-50/60 px-6 text-center sm:h-[300px] dark:bg-zinc-900/40">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-800">
              <DollarSign className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-semibold">No earnings yet</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              Completed bookings this {range === "week" ? "week" : "month"}{" "}
              will show up here.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full sm:h-[300px]"
          >
            {chartType === "bar" ? (
              <BarChart data={points} margin={{ left: 0, right: 8 }}>
                {sharedAxes}
                <Bar
                  dataKey="netCents"
                  fill="var(--color-netCents)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={points} margin={{ left: 0, right: 8 }}>
                {sharedAxes}
                <Line
                  type="monotone"
                  dataKey="netCents"
                  stroke="var(--color-netCents)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
        {isPending && (
          <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">
            Updating…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
