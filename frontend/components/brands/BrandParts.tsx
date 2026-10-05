"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import ProductCard from "@/components/product/ProductCard";

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Brand page "Compatible Parts" — real parts for the brand (server-rendered
 * first batch + controlled Load More, 8 at a time, deduped). Empty catalog →
 * proper empty state, never placeholder products.
 */
export default function BrandParts({
  slug,
  initial,
  pagination,
}: {
  slug: string;
  initial: any[];
  pagination: Pagination;
}) {
  const [items, setItems] = useState<any[]>(initial);
  const [page, setPage] = useState(pagination.page);
  const [total, setTotal] = useState(pagination.total);
  const [hasNext, setHasNext] = useState(pagination.hasNextPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMore = async () => {
    if (loading || !hasNext) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.fetch(
        `/vehicles/brands/${slug}/products?page=${page + 1}&limit=${pagination.limit || 8}`
      );
      const seen = new Set(items.map((p) => String(p._id)));
      const fresh = ((data.products || []) as any[]).filter(
        (p) => !seen.has(String(p._id))
      );
      setItems((prev) => [...prev, ...fresh]);
      setPage(data.pagination?.page ?? page + 1);
      setTotal(data.pagination?.total ?? total);
      setHasNext(!!data.pagination?.hasNextPage);
    } catch (e: any) {
      setError(e?.message || "Could not load more parts.");
    }
    setLoading(false);
  };

  return (
    <section aria-labelledby="brand-parts">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="brand-parts" className="vp-heading">
          Compatible Parts
        </h2>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {items.length} of {total} {total === 1 ? "part" : "parts"}
          </span>
        )}
      </div>

      {total === 0 ? (
        <div className="vp-empty">
          <span className="vp-empty-icon">
            <Package className="h-6 w-6" aria-hidden />
          </span>
          <p className="vp-empty-title">No compatible parts yet</p>
          <p className="vp-empty-desc">
            Parts for this brand will appear here as soon as they are listed.
          </p>
          <Link href="/products" className="vp-btn-ink min-h-11 px-7">
            Browse All Parts
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
            {items.map((p) => (
              <ProductCard key={String(p._id)} product={p} />
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            {error ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" className="min-h-11 px-6" onClick={loadMore}>
                  Retry
                </Button>
              </div>
            ) : hasNext ? (
              <Button
                variant="outline"
                className="min-h-11 gap-1.5 px-7 text-[15px]"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
                  </>
                ) : (
                  <>
                    Load More <ChevronDown className="h-4 w-4" aria-hidden />
                  </>
                )}
              </Button>
            ) : (
              total > (pagination.limit || 8) && (
                <p className="border-t border-border pt-5 text-sm text-muted-foreground">
                  You&apos;ve seen all parts for this brand
                </p>
              )
            )}
          </div>
        </>
      )}
    </section>
  );
}
