import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6" aria-busy="true" aria-label="Loading service">
      <section className="border-b bg-white px-4 py-6 md:px-6 md:py-8 dark:bg-zinc-900 dark:border-zinc-800">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-2/3" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
      </section>

      <div className="grid gap-8 py-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-6 flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
          <div className="rounded-xl border bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-64" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-full ml-auto" />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 flex gap-3">
              <Skeleton className="size-16 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-full rounded-full" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
