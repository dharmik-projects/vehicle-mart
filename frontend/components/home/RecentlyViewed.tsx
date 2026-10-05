"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { getRecentIds } from "@/lib/recent";
import ProductCard from "@/components/product/ProductCard";
import SectionHead from "./SectionHead";

/** Controlled first view: 4 on desktop/tablet, 2 on phones (CSS-revealed). */
const INITIAL_DESKTOP = 4;
const INITIAL_MOBILE = 2;
/** Matches the history cap in lib/recent.ts. */
const HISTORY_LIMIT = 24;

interface RecentlyViewedProps {
  /** The product currently being viewed — excluded on the PDP so a product
   *  never shows itself in its own history row. */
  excludeId?: string;
  /** Section wrapper classes (the PDP passes a bare margin because it is
   *  already inside a vp-container). */
  className?: string;
}

/**
 * "Recently Viewed" — products the user actually opened (history kept in
 * localStorage). Renders NOTHING when there is no history or the products no
 * longer exist. Only a small slice is shown at first (2 mobile / 4 desktop);
 * "View All" opens the dedicated /recently-viewed page — the full history is
 * never dumped onto the homepage or PDP. Data is fetched fresh so prices/stock
 * are current. Real history only — never synthesized.
 */
export default function RecentlyViewed({
  excludeId,
  className = "vp-container vp-section",
}: RecentlyViewedProps) {
  const [items, setItems] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    const ids = getRecentIds().filter((id) => id !== excludeId);
    if (ids.length === 0) return; // no history → no section

    (async () => {
      try {
        const data = await api.getProducts({
          ids: ids.join(","),
          limit: String(HISTORY_LIMIT),
        });
        const byId = new Map<string, any>(
          ((data.products || []) as any[]).map((p) => [String(p._id), p])
        );
        // Keep the order from history (newest first)
        const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
        if (!alive) return;
        setItems(ordered);
        setVisible(ordered.length > 0);
      } catch {
        /* non-blocking — section simply stays hidden */
      }
    })();

    return () => {
      alive = false;
    };
  }, [excludeId]);

  if (!visible || items.length === 0) return null;

  const shown = items.slice(0, INITIAL_DESKTOP);
  const needsExpand = items.length > INITIAL_MOBILE;
  /* Items past the 2-phone cap are hidden below `sm`; the View All link
     follows the same rule so it only appears where it does something. */
  const btnLayout = items.length > INITIAL_DESKTOP ? "" : " sm:hidden";

  return (
    <section className={className}>
      <SectionHead title="Recently Viewed" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
        {shown.map((p, i) => (
          <div
            key={p._id}
            className={i >= INITIAL_MOBILE && i < INITIAL_DESKTOP ? "hidden sm:block" : undefined}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {needsExpand && (
        <div className="mt-6 flex justify-center">
          <Link
            href="/recently-viewed"
            className={`vp-btn min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-6 text-[15px] text-foreground transition-colors hover:bg-muted${btnLayout}`}
          >
            View All ({items.length}) <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
