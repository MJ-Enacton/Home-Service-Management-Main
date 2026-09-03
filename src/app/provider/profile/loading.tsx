import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-6 w-32" />
      <Skeleton className="mt-1 h-3 w-48" />

      <div className="mt-6 flex gap-4 rounded-xl border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800">
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-20 w-full rounded-lg" />
        </div>
      </div>
    </main>
  );
}
