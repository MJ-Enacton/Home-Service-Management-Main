import { Skeleton } from "@/components/ui/skeleton";
import { BookingCardSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 md:px-6" aria-busy="true" aria-label="Loading bookings">
      <div className="mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-6 w-48" />
        <Skeleton className="mt-1 h-3 w-64" />
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-white p-3 dark:bg-zinc-900 dark:border-zinc-800 sm:flex-row">
        <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
        <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
        <Skeleton className="h-10 w-full max-w-xs rounded-lg" />
      </div>

      <div className="space-y-3">
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </div>
    </main>
  );
}
