import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6"
      aria-busy="true"
      aria-label="Loading services"
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-6 w-40" />
      <Skeleton className="mt-1 h-3 w-64" />
      <div className="mt-4 flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 dark:bg-zinc-900 dark:border-zinc-800">
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
    </main>
  );
}
