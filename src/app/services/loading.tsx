import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 md:px-6" aria-busy="true" aria-label="Loading services">
      <section className="border-b bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
          <Skeleton className="h-3 w-24" />
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-72 rounded-full" />
          </div>
        </div>
      </section>

      <div className="flex gap-8 pt-6 pb-16">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-xl border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-4 w-20" />
            <div className="mt-3 space-y-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-px w-full" />
            <Skeleton className="mt-4 h-4 w-20" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-px w-full" />
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-12 rounded-lg" />
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between rounded-xl border bg-white px-4 py-2.5 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-1">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
