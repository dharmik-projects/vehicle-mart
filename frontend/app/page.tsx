import { Suspense } from "react";
import CategoryNav from "@/components/layout/CategoryNav";
import VehicleSelector from "@/components/vehicle/VehicleSelector";
import CategorySection from "@/components/home/CategorySection";
import ShopByVehicle from "@/components/home/ShopByVehicle";
import PopularSection from "@/components/home/PopularSection";
import DealsSection from "@/components/home/DealsSection";
import PopularBrandsSection from "@/components/home/PopularBrandsSection";
import ProductFeedSection from "@/components/home/ProductFeedSection";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import TrustFeatures from "@/components/home/TrustFeatures";
import SectionHead from "@/components/home/SectionHead";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CategoryGridSkeleton,
  ProductGridSkeleton,
} from "@/components/home/skeletons";

/**
 * Homepage — Server Component.
 *
 * Data is fetched on the server in parallel (5-min in-memory cache, no
 * duplicate requests) and each section streams inside its OWN Suspense
 * boundary, so the header/nav shell flushes immediately and every section
 * renders as soon as ITS OWN data resolves — vehicle data never blocks
 * products/categories, and below-the-fold sections never block above-fold
 * ones.
 *
 * Section order: CategoryNav → Find Parts for Your Vehicle → Shop by
 * Category → Shop by Vehicle → Popular & Featured → Deals → Popular Brands
 * → All Products → Recently Viewed → Trust Features → Footer.
 *
 * `revalidate = 60` serves fully-rendered HTML instantly (stale-while-
 * revalidate), so repeat visitors never wait on any API for the shell.
 */
export const revalidate = 60;

/* Fallback skeletons — shown only while that section's request is pending */
function VehicleShopSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Skeleton className="h-[168px] rounded-lg" />
      <Skeleton className="h-[168px] rounded-lg" />
    </div>
  );
}

function BrandPillsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array(6)
        .fill(0)
        .map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="fade-in">
      <h1 className="sr-only">
        VehiclePart — Genuine spare parts for cars, bikes, trucks and tractors
      </h1>

      {/* ── 1. Vehicle type navigation (static — renders immediately) ── */}
      <CategoryNav />

      {/* ── 2. Find Parts for Your Vehicle (client island — own lazy fetch,
             never blocks categories or products) ────────────────────── */}
      <VehicleSelector />

      {/* ── 3. Shop by Category — streams when the category API responds ─ */}
      <section className="vp-container vp-section">
        <SectionHead title="Shop by Category" href="/categories" />
        <Suspense fallback={<CategoryGridSkeleton />}>
          <CategorySection />
        </Suspense>
      </section>

      {/* ── 4. Shop by Vehicle — real car / 2-wheeler data from MongoDB ── */}
      <Suspense fallback={<VehicleShopSkeleton />}>
        <ShopByVehicle />
      </Suspense>

      <div className="vp-container"><div className="h-px bg-border" /></div>

      {/* ── 5. Popular / Featured — streams when the products API responds ─ */}
      <section className="border-y border-border bg-muted/30">
        <div className="vp-container vp-section">
          <SectionHead title="Popular & Featured" href="/products?sort=popular" />
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <PopularSection />
          </Suspense>
        </div>
      </section>

      {/* ── 6. Deals & Best Offers — real mrp>price products (self-hides) ─ */}
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <DealsSection />
      </Suspense>

      {/* ── 7. Popular Brands — real brands that have products (self-hides) ─ */}
      <Suspense fallback={<BrandPillsSkeleton />}>
        <PopularBrandsSection />
      </Suspense>

      {/* ── 8. Product feed — page 1 from the server, more on scroll ──── */}
      <section className="vp-container vp-section">
        <SectionHead title="All Products" href="/products" />
        <Suspense fallback={<ProductGridSkeleton count={10} />}>
          <ProductFeedSection />
        </Suspense>
      </section>

      {/* ── 9. Recently Viewed — client, hidden when no history ────────── */}
      <RecentlyViewed />

      {/* ── 10. Trust features ─────────────────────────────────────────── */}
      <TrustFeatures />
    </div>
  );
}
