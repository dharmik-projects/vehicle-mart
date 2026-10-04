import Link from "next/link";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import SectionHead from "./SectionHead";

/**
 * "Popular Brands" — real brands that actually have active products in
 * MongoDB, ordered by product count. Never hardcodes brand names.
 * Renders nothing when no branded products exist.
 */
export default async function PopularBrandsSection() {
  let brands: { name: string; count: number }[] = [];
  try {
    const data = await cached("home:pbrands", () =>
      api.fetch("/products/popular-brands?limit=12")
    );
    brands = data.brands || [];
  } catch {
    brands = [];
  }

  if (brands.length === 0) return null;

  return (
    <section className="vp-container vp-section">
      <SectionHead title="Popular Brands" href="/products" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {brands.map((b) => (
          <Link
            key={b.name}
            href={`/products?brand=${encodeURIComponent(b.name)}`}
            className="vp-card vp-card-hover flex items-center justify-between gap-3 px-4 py-3.5"
          >
            <span className="truncate text-[15px] font-medium text-foreground">{b.name}</span>
            <span className="shrink-0 text-[13px] text-muted-foreground">
              {b.count} {b.count === 1 ? "part" : "parts"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
