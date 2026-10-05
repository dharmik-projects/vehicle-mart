import type { Metadata } from "next";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import BrandCatalog from "@/components/brands/BrandCatalog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "All Vehicle Brands | VehiclePart",
  description:
    "Browse every vehicle brand in the VehiclePart catalog — cars, bikes, trucks, tractors and EVs.",
};

/**
 * All Vehicle Brands — the Popular Brands "View All" destination.
 * Every brand and product count comes from MongoDB via
 * GET /vehicles/brands?withCounts=true (counts are omitted server-side when
 * a brand has no parts — nothing is ever fabricated).
 */
export default async function BrandsPage() {
  let brands: any[] = [];
  try {
    const data = await cached("brands:all", () =>
      api.fetch("/vehicles/brands?withCounts=true")
    );
    brands = data.brands || [];
  } catch {
    brands = [];
  }

  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <Breadcrumbs items={[{ label: "All Vehicle Brands" }]} />

      <div className="mb-6">
        <h1 className="vp-page-title">All Vehicle Brands</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
          Every brand, model and part count below is live from the vehicle
          catalog — counts appear only where parts actually exist.
        </p>
      </div>

      <BrandCatalog brands={brands} />
    </div>
  );
}
