"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Package, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import { ProductSkeleton } from "./skeletons";

export const PAGE_SIZE = 12;

interface ProductFeedProps {
  /** First page — fetched server-side so HTML arrives with real products. */
  initialItems: any[];
  initialHasMore: boolean;
  /** Set when the server-side first-page fetch failed (error + retry UI). */
  initialError: string | null;
}

/**
 * Infinite product feed. Page 1 comes from the server (no skeleton wait);
 * further pages load only as the sentinel scrolls into view (below the fold).
 */
export default function ProductFeed({
  initialItems,
  initialHasMore,
  initialError,
}: ProductFeedProps) {
  const [feed, setFeed] = useState<any[]>(initialItems);
  const [feedPage, setFeedPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialHasMore && !initialError);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(initialError);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlight = useRef(false);
  const seenIds = useRef<Set<string>>(new Set(initialItems.map((p) => p?._id).filter(Boolean)));

  /* Load one page (deduped, no duplicate requests) */
  const loadFeedPage = useCallback(async (page: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const data = await api.getProducts({ page: String(page), limit: String(PAGE_SIZE) });
      const items: any[] = data.products || [];
      const fresh = items.filter((p) => p?._id && !seenIds.current.has(p._id));
      fresh.forEach((p) => seenIds.current.add(p._id));
      setFeed((prev) => (fresh.length ? [...prev, ...fresh] : prev));

      const meta = data.pagination || {};
      const more =
        typeof meta.hasNextPage === "boolean"
          ? meta.hasNextPage
          : items.length >= PAGE_SIZE;
      setHasMore(more);
      setFeedPage(page + 1);
    } catch (err: any) {
      setFeedError(err?.message || "Could not load products.");
      setHasMore(false);
    } finally {
      inFlight.current = false;
      setFeedLoading(false);
    }
  }, []);

  /* IntersectionObserver → append next page when the sentinel is near view */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || feedLoading) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadFeedPage(feedPage);
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, feedLoading, feedPage, loadFeedPage]);

  return (
    <>
      {feed.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {feed.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
          {/* skeletons fill remaining first-page slots while a page loads */}
          {feedLoading &&
            Array(Math.min(PAGE_SIZE - feed.length, 5) > 0 ? Math.min(PAGE_SIZE - feed.length, 5) : 0)
              .fill(0)
              .map((_, i) => (
                <ProductSkeleton key={`sk-${i}`} />
              ))}
        </div>
      ) : feedLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array(10)
            .fill(0)
            .map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
        </div>
      ) : feedError ? (
        <div className="vp-empty">
          <span className="vp-empty-icon">
            <Package className="h-6 w-6" />
          </span>
          <p className="vp-empty-title">Couldn&apos;t load products</p>
          <p className="vp-empty-desc">{feedError}</p>
          <Button variant="outline" onClick={() => loadFeedPage(1)}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="vp-empty">
          <span className="vp-empty-icon">
            <Package className="h-6 w-6" />
          </span>
          <p className="vp-empty-title">No products yet</p>
          <p className="vp-empty-desc">
            Parts listed by sellers will appear in this feed.
          </p>
          <Link href="/categories">
            <Button>Browse categories</Button>
          </Link>
        </div>
      )}

      {/* Sentinel: fetch the next page when it scrolls into view */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {feedLoading && feed.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading more products…
        </div>
      )}

      {!hasMore && feed.length > 0 && (
        <p className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          You&apos;ve seen all {feed.length} {feed.length === 1 ? "product" : "products"}.
        </p>
      )}
    </>
  );
}
