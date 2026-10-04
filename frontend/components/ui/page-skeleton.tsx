import { Skeleton } from "@/components/ui/skeleton";

//
// Shared route-transition skeletons (loading.tsx) — Minimal Neutral style:
// title bar + subtitle bar, then content placeholders. Server-safe, no hooks.
//

/** Title + subtitle + responsive grid of 8 product-style cards. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 mt-3" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 mt-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Title + subtitle + 6 wide list-row skeletons (dashboards, lists, forms). */
export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 mt-3" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
