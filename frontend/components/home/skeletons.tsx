import { Skeleton } from "@/components/ui/skeleton";

/** Shared product-card skeleton (feed loading + section fallbacks). */
export function ProductSkeleton() {
  return (
    <div className="vp-card overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-2/5" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
    </div>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {Array(10)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-lg" />
        ))}
    </div>
  );
}
