import { Skeleton } from "@/components/ui/skeleton";

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 dark:border-zinc-800" aria-hidden>
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-3 w-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center justify-between border-t pt-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ListingRowSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border bg-white p-3 dark:bg-zinc-900 dark:border-zinc-800" aria-hidden>
      <Skeleton className="h-28 w-40 shrink-0 rounded-lg sm:w-48" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <div className="mt-auto flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BookingCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800" aria-hidden>
      <div className="flex justify-between gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-full sm:col-span-2" />
      </div>
      <Skeleton className="mt-3 h-8 w-24 rounded-full" />
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-5 dark:bg-zinc-950 dark:border-zinc-800" aria-hidden>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-2/3" />
      <div className="mt-4 flex gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <Skeleton className="size-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800" aria-hidden>
      <div className="flex justify-between">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-4 w-10 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-20" />
      <Skeleton className="mt-2 h-6 w-24" />
      <Skeleton className="mt-1 h-3 w-32" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-white p-3.5 dark:bg-zinc-900 dark:border-zinc-800" aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
  );
}
