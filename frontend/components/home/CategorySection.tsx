import { Package } from "lucide-react";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import CategoryCarousel from "./CategoryCarousel";

/* System/role entries that must never appear in "Shop by Category" */
const SYSTEM_CATEGORY_RE =
  /^(user|users|seller|sellers|admin|admins|role|roles|system|systems)$/i;

const isPartCategory = (cat: any) =>
  !!cat?.name && !SYSTEM_CATEGORY_RE.test(cat.name.trim());

/**
 * Server component: renders the TOP-LEVEL categories as a single horizontal
 * carousel row (swipeable on mobile, arrow-scrolled on desktop) as soon as
 * the category API responds — never a multi-row grid of tiny cards, and it
 * never waits for products or vehicle data. Reference data is cached
 * server-side for 5 minutes.
 */
export default async function CategorySection() {
  let categories: any[] = [];
  try {
    const data = await cached("home:categories", () => api.getCategories());
    // The API already returns only active categories; keep the system-entry
    // deny-list as a safety net.
    categories = ((data.categories || []) as any[]).filter(isPartCategory);
  } catch {
    categories = [];
  }

  if (categories.length === 0) {
    return (
      <div className="vp-empty">
        <span className="vp-empty-icon">
          <Package className="h-6 w-6" />
        </span>
        <p className="vp-empty-title">No categories yet</p>
        <p className="vp-empty-desc">Categories will appear here once they are added.</p>
      </div>
    );
  }

  return <CategoryCarousel categories={categories} />;
}
