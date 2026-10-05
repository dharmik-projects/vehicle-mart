import Link from "next/link";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { vehicleTypeLabels } from "@/lib/vehicles";
import SectionHead from "./SectionHead";

/**
 * "Popular Brands" — REAL vehicle brands from the MongoDB VehicleBrand
 * collection, served by GET /vehicles/popular-brands. The product count is
 * computed server-side from actual compatibility links / matching products;
 * brands without products come back with NO count field, so the chip renders
 * the name alone instead of inventing a number. "View all" opens the
 * dedicated /brands catalog; each chip opens its /brands/[slug] detail page.
 * Renders nothing when the brand catalog is empty — never a hardcoded list.
 */
interface BrandChip {
  _id: string;
  name: string;
  slug: string;
  vehicleType?: string[];
  productCount?: number;
}

export default async function PopularBrandsSection() {
  let brands: BrandChip[] = [];
  try {
    const data = await cached("home:vehicle-brands", () =>
      api.fetch("/vehicles/popular-brands?limit=12")
    );
    brands = (data.brands || []) as BrandChip[];
  } catch {
    brands = [];
  }

  if (brands.length === 0) return null;

  return (
    <section className="vp-container vp-section">
      <SectionHead title="Popular Brands" href="/brands" linkLabel="View all brands" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {brands.map((b) => {
          const types = vehicleTypeLabels(b.vehicleType);
          return (
            <Link
              key={b._id}
              href={`/brands/${b.slug}`}
              className="vp-card vp-card-hover group flex min-h-11 items-center justify-between gap-3 px-4 py-3.5"
              title={types.length > 0 ? `${b.name} — ${types.join(", ")}` : b.name}
            >
              <span className="truncate text-[15px] font-medium text-foreground">{b.name}</span>
              {typeof b.productCount === "number" && b.productCount > 0 ? (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium text-muted-foreground">
                  {b.productCount} {b.productCount === 1 ? "part" : "parts"}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
