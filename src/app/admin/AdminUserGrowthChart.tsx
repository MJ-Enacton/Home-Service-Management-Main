"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { BarChart3, ChartLine, Users } from "lucide-react";

import type { AdminRange } from "@/lib/db/queries/admin-stats";
import { getAdminSeries } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type ChartType = "bar" | "line";

interface AdminUserGrowthChartProps {
  initialPoints: {
    date: string;
    label: string;
    customers: number;
    providers: number;
  }[];
  initialRange: AdminRange;
  initialView: ChartType;
}

const userGrowthChartConfig = {
  customers: { label: "Customers", color: "hsl(var(--chart-1))" },
  providers: { label: "Providers", color: "hsl(var(--chart-2))" },
} satisfies {
  customers: { label: string; color: string };
  providers: { label: string; color: string };
};

export function AdminUserGrowthChart({
  initialPoints,
  initialRange,
  initialView,
}: AdminUserGrowthChartProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [range, setRange] = useState<AdminRange>(initialRange);
  const [chartType, setChartType] = useState<ChartType>(initialView);
  const [points, setPoints] = useState(initialPoints);
  const [isPending, startTransition] = useTransition();

  const totals = useMemo(() => {
    const last = points[points.length - 1];
    return {
      customers: last?.customers ?? 0,
      providers: last?.providers ?? 0,
    };
  }, [points]);
  const isEmpty = totals.customers === 0 && totals.providers === 0;

  function syncUrl(nextRange: AdminRange, nextView: ChartType) {
    const params = new URLSearchParams();
    if (nextRange !== "week") params.set("growthRange", nextRange);
    if (nextView !== "line") params.set("growthView", nextView);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleRange(next: AdminRange) {
    if (next === range || isPending) return;
    setRange(next);
    syncUrl(next, chartType);
    startTransition(async () => {
      const result = await getAdminSeries("user-growth", next);
      if (result.success) setPoints(result.points as typeof points);
    });
  }

  function handleChartType(next: ChartType) {
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
        tickFormatter={(value: number) => String(value)}
      />
      <ChartTooltip
        content={<ChartTooltipContent formatter={(value) => value} />}
      />
      <ChartLegend>
        <ChartLegendContent />
      </ChartLegend>
    </>
  );

  return (
    <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">User Growth</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {range === "week"
                ? "Cumulative growth · Mon–Sun"
                : "Cumulative growth · this month"}{" "}
              · {totals.customers + totals.providers} total
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className="inline-flex rounded-full border bg-white p-0.5 dark:bg-zinc-900"
              role="tablist"
              aria-label="Range"
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
          <div className="flex h-65 flex-col items-center justify-center rounded-xl border border-dashed bg-zinc-50/60 px-6 text-center sm:h-75 dark:bg-zinc-900/40">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-zinc-800">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-semibold">No users yet</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              New signups this {range === "week" ? "week" : "month"} will show
              up here.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={userGrowthChartConfig}
            className="aspect-auto h-65 w-full sm:h-75"
          >
            {chartType === "bar" ? (
              <BarChart data={points} margin={{ left: 0, right: 8 }}>
                {sharedAxes}
                <Bar
                  dataKey="customers"
                  fill="hsl(var(--chart-1))"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="providers"
                  fill="hsl(var(--chart-2))"
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={points} margin={{ left: 0, right: 8 }}>
                {sharedAxes}
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="providers"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ChartContainer>
        )}
        {isPending && (
          <p
            className="mt-2 text-center text-xs text-muted-foreground"
            aria-live="polite"
          >
            Updating…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
