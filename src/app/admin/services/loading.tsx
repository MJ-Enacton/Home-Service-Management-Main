import { Skeleton } from "@/components/ui/skeleton";
import { TableRowSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl" aria-busy="true" aria-label="Loading listings">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-1 h-3 w-64" />
      <Skeleton className="mt-4 h-9 w-full rounded-full" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRowSkeleton key={i} cols={4} />
        ))}
      </div>
    </div>
  );
}
