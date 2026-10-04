import Link from "next/link";
import { Package } from "lucide-react";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";

/**
 * Server component: "Popular & Featured" row. Fetches 8 products once,
 * cached server-side for 5 minutes, and streams in independently of the
 * categories and feed sections (its own Suspense boundary).
 */
export default async function PopularSection() {
  let products: any[] = [];
  try {
    const data = await cached("home:popular", () =>
      api.getProducts({ limit: "8", sort: "popular" })
    );
    products = data.products || [];
  } catch {
    products = [];
  }

  if (products.length === 0) {
    return (
      <div className="vp-empty">
        <span className="vp-empty-icon">
          <Package className="h-6 w-6" />
        </span>
        <p className="vp-empty-title">No featured products</p>
        <p className="vp-empty-desc">
          Popular parts will show up here as sellers list them.
        </p>
        <Link href="/products">
          <Button>Browse all parts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((p) => (
        <ProductCard key={p._id} product={p} />
      ))}
    </div>
  );
}
