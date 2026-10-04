import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import ProductCard from "@/components/product/ProductCard";
import SectionHead from "./SectionHead";

/**
 * "Deals & Best Offers" — real products whose MRP is genuinely above the
 * selling price (server-side `mrp > price` filter, biggest discount first).
 * Renders nothing when there are no real discounted products — never fakes
 * a discount.
 */
export default async function DealsSection() {
  let products: any[] = [];
  try {
    const data = await cached("home:deals", () => api.fetch("/products/deals?limit=8"));
    products = data.products || [];
  } catch {
    products = [];
  }

  if (products.length === 0) return null;

  return (
    <section className="vp-container vp-section">
      <SectionHead title="Deals & Best Offers" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}
