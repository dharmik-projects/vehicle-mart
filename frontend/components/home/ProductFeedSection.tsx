import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { FEED_BATCH_SIZE } from "@/lib/feed";
import ProductFeed from "./ProductFeed";

/**
 * Server component: fetches the first feed batch (8 products, cached
 * server-side for 5 minutes) so the HTML ships with real products — no
 * client-side skeleton wait for page 1. Further batches load only when the
 * user clicks Load More in <ProductFeed />.
 */
export default async function ProductFeedSection() {
  try {
    const data = await cached(`home:feed:${FEED_BATCH_SIZE}`, () =>
      api.getProducts({ page: "1", limit: String(FEED_BATCH_SIZE) })
    );
    const items: any[] = data.products || [];
    const hasMore =
      typeof data.pagination?.hasNextPage === "boolean"
        ? data.pagination.hasNextPage
        : items.length >= FEED_BATCH_SIZE;
    const total =
      typeof data.pagination?.total === "number" ? data.pagination.total : 0;

    return (
      <ProductFeed
        initialItems={items}
        initialHasMore={hasMore}
        initialTotal={total}
        initialError={null}
      />
    );
  } catch (err: any) {
    // Request finished (failed) — hand the error to the client so the real
    // error state + retry button render instead of an endless skeleton.
    return (
      <ProductFeed
        initialItems={[]}
        initialHasMore={false}
        initialTotal={0}
        initialError={err?.message || "Could not load products."}
      />
    );
  }
}
