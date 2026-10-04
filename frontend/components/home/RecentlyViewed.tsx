"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getRecentIds } from "@/lib/recent";
import ProductCard from "@/components/product/ProductCard";
import SectionHead from "./SectionHead";

/**
 * "Recently Viewed" — products the user actually opened (history kept in
 * localStorage). Renders NOTHING (no empty section) when there is no history
 * or the products no longer exist. Data is fetched fresh so prices/stock
 * are current.
 */
export default function RecentlyViewed() {
  const [items, setItems] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    const ids = getRecentIds();
    if (ids.length === 0) return; // no history → no section

    (async () => {
      try {
        const data = await api.getProducts({ ids: ids.join(","), limit: "12" });
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
  }, []);

  if (!visible || items.length === 0) return null;

  return (
    <section className="vp-container vp-section">
      <SectionHead title="Recently Viewed" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}
