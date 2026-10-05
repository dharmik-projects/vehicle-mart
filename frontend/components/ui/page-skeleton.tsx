import { Skeleton } from "@/components/ui/skeleton";

//
// Shared route-transition skeletons (loading.tsx) — Minimal Neutral style:
// title bar + subtitle bar, then content placeholders. Server-safe, no hooks.
// Grid/card proportions mirror the canonical customer-facing product grid:
//   grid-cols-2 → md:grid-cols-3 → lg:grid-cols-4 → xl:grid-cols-5, aspect-square art.
//

/** Title + subtitle + responsive grid of product-style cards. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Title + subtitle + 6 wide list-row skeletons (dashboards, lists, forms). */
export function ListRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
