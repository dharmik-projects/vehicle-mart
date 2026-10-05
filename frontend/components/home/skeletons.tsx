import { Skeleton } from "@/components/ui/skeleton";

/** Shared product-card skeleton (mirrors ProductCard's badge row + 4:3 image). */
export function ProductSkeleton() {
  return (
    <div className="vp-card overflow-hidden">
      <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-2.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="mt-1 h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
    </div>
  );
}

/* Mirrors the single-row horizontal category carousel (NOT a multi-row grid) */
export function CategoryGridSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array(10)
        .fill(0)
        .map((_, i) => (
          <Skeleton
            key={i}
            className="h-[134px] w-[132px] shrink-0 sm:w-[152px] lg:w-[176px]"
          />
        ))}
    </div>
  );
}
