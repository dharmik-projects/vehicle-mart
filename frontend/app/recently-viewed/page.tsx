import type { Metadata } from "next";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import RecentlyViewedExplorer from "@/components/product/RecentlyViewedExplorer";

export const metadata: Metadata = {
  title: "Recently Viewed | VehiclePart",
  description: "Products you recently viewed on VehiclePart.",
};

/**
 * Recently Viewed — dedicated "View All" destination for the homepage and
 * PDP history sections. History lives in the browser (real view events only,
 * via lib/recent.ts); every product is hydrated fresh from the API so there
 * is no way to show fake or stale entries.
 */
export default function RecentlyViewedPage() {
  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <Breadcrumbs items={[{ label: "Recently Viewed" }]} />
      <RecentlyViewedExplorer />
    </div>
  );
}
