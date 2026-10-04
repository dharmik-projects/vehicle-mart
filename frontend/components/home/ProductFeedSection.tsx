import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import ProductFeed, { PAGE_SIZE } from "./ProductFeed";

/**
 * Server component: fetches the first feed page once (cached server-side for
 * 5 minutes) so the HTML ships with real products — no client-side skeleton
 * wait for page 1. Pagination continues client-side in <ProductFeed />.
 */
export default async function ProductFeedSection() {
  try {
    const data = await cached("home:feed:1", () =>
      api.getProducts({ page: "1", limit: String(PAGE_SIZE) })
    );
    const items: any[] = data.products || [];
    const hasMore =
      typeof data.pagination?.hasNextPage === "boolean"
        ? data.pagination.hasNextPage
        : items.length >= PAGE_SIZE;

    return (
      <ProductFeed initialItems={items} initialHasMore={hasMore} initialError={null} />
    );
  } catch (err: any) {
    // Request finished (failed) — hand the error to the client so the real
    // error state + retry button render instead of an endless skeleton.
    return (
      <ProductFeed
        initialItems={[]}
        initialHasMore={false}
        initialError={err?.message || "Could not load products."}
      />
    );
  }
}
