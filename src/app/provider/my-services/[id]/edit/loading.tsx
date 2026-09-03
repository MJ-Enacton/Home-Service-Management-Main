import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6" aria-busy="true" aria-label="Loading editor">
      <Skeleton className="h-3 w-24" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-4 h-9 w-full rounded-lg" />
            <Skeleton className="mt-3 h-20 w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 dark:bg-zinc-900 dark:border-zinc-800">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-4 h-9 w-40 rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 dark:bg-zinc-900 dark:border-zinc-800">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-4 h-9 w-full rounded-full" />
        </div>
      </div>
    </main>
  );
}
