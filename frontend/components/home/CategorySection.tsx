import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { thumbUrl } from "@/lib/images";

/* System/role entries that must never appear in "Shop by Category" */
const SYSTEM_CATEGORY_RE =
  /^(user|users|seller|sellers|admin|admins|role|roles|system|systems)$/i;

const isPartCategory = (cat: any) =>
  !!cat?.name && !SYSTEM_CATEGORY_RE.test(cat.name.trim());

/**
 * Server component: renders the category grid as soon as the category API
 * responds (inside its own Suspense boundary — never waits for products or
 * vehicle data). Reference data is cached server-side for 5 minutes.
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

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
      {categories.map((cat) => (
        <Link
          key={cat._id}
          href={`/products?category=${cat._id}`}
          className="vp-card vp-card-hover group flex min-h-[84px] flex-col items-center justify-center gap-2 p-3 text-center"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/80 text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
            {cat.image?.url ? (
              <Image
                src={thumbUrl(cat.image.url, 96)}
                alt=""
                width={36}
                height={36}
                loading="lazy"
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : cat.icon ? (
              <span className="text-lg leading-none" aria-hidden>
                {cat.icon}
              </span>
            ) : (
              <Package className="h-5 w-5" />
            )}
          </span>
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-center text-foreground">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
