import { Skeleton } from "@/components/ui/skeleton";
import { KpiCardSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950" aria-busy="true" aria-label="Loading dashboard">
      <section className="border-b bg-white dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6 md:py-10">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <div className="rounded-2xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-48" />
            <Skeleton className="mt-6 h-[190px] w-full rounded-xl border border-dashed" />
          </div>
          <div className="rounded-2xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 py-2">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
          <Skeleton className="h-4 w-40" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900 dark:border-zinc-800">
                <Skeleton className="h-28 w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
