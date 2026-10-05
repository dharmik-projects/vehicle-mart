"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Package, Loader2, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { FEED_BATCH_SIZE } from "@/lib/feed";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import { ProductSkeleton } from "./skeletons";

/** Controlled batch size — the feed never dumps the whole catalog. */
const PAGE_SIZE = FEED_BATCH_SIZE;

interface ProductFeedProps {
  /** First page — fetched server-side so HTML arrives with real products. */
  initialItems: any[];
  initialHasMore: boolean;
  /** Total product count (for the "Showing X of Y" progress line). */
  initialTotal: number;
  /** Set when the server-side first-page fetch failed (error + retry UI). */
  initialError: string | null;
}

/**
 * Controlled product feed with a Load More button.
 *
 * Page 1 (8 products) comes from the server (no skeleton wait); each click
 * fetches the NEXT batch and appends it — existing cards stay on screen,
 * duplicates are dropped by id, and the button disappears in favour of a
 * "You've seen all products" note once pagination reports no next page.
 */
export default function ProductFeed({
  initialItems,
  initialHasMore,
  initialTotal,
  initialError,
}: ProductFeedProps) {
  const [feed, setFeed] = useState<any[]>(initialItems);
  const [feedPage, setFeedPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialHasMore && !initialError);
  const [total, setTotal] = useState(initialTotal);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(initialError);

  const inFlight = useRef(false);
  const seenIds = useRef<Set<string>>(new Set(initialItems.map((p) => p?._id).filter(Boolean)));

  useEffect(() => {
    setTotal((prev) => prev || initialTotal);
  }, [initialTotal]);

  /* Load one batch (deduped, no duplicate requests) */
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
      if (typeof meta.total === "number") setTotal(meta.total);
      const more =
        typeof meta.hasNextPage === "boolean"
          ? meta.hasNextPage
          : items.length >= PAGE_SIZE;
      setHasMore(more);
      setFeedPage(page + 1);
    } catch (err: any) {
      setFeedError(err?.message || "Could not load products.");
      setHasMore(true); // keep Load More available so the user can retry
    } finally {
      inFlight.current = false;
      setFeedLoading(false);
    }
  }, []);

  const retryLoadMore = useCallback(() => {
    setFeedError(null);
    loadFeedPage(feedPage);
  }, [feedPage, loadFeedPage]);

  return (
    <>
      {feed.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
          {feed.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
          {/* skeletons fill remaining batch slots while a page loads */}
          {feedLoading &&
            Array(Math.min(PAGE_SIZE, 4))
              .fill(0)
              .map((_, i) => (
                <ProductSkeleton key={`sk-${i}`} />
              ))}
        </div>
      ) : feedLoading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
          {Array(PAGE_SIZE)
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

      {/* ── Controlled loading: Load More / progress / end of catalog ── */}
      {feed.length > 0 && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {feed.length}
            {total > 0 ? ` of ${total}` : ""} {total === 1 ? "product" : "products"}
          </p>

          {feedError && feed.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-destructive">{feedError}</p>
              <Button variant="outline" className="min-h-11 px-6" onClick={retryLoadMore}>
                Retry
              </Button>
            </div>
          ) : hasMore ? (
            <Button
              variant="outline"
              className="min-h-11 gap-1.5 px-7 text-[15px]"
              onClick={() => loadFeedPage(feedPage)}
              disabled={feedLoading}
            >
              {feedLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </>
              ) : (
                <>
                  Load More <ChevronDown className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          ) : (
            <p className="border-t border-border pt-5 text-sm text-muted-foreground">
              You&apos;ve seen all products
            </p>
          )}
        </div>
      )}
    </>
  );
}
