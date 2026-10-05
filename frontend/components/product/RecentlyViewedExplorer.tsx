"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { clearRecentHistory, getRecentIds, removeRecentId } from "@/lib/recent";
import { vehicleTypeLabel } from "@/lib/vehicles";
import ProductCard from "@/components/product/ProductCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BATCH = 8;
const ALL = "all";

const SORTS = [
  { value: "recent", label: "Recently Viewed" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Rating" },
];

/**
 * /recently-viewed explorer.
 *
 * Real history only: product IDs come from localStorage (written by actual
 * PDP visits), hydrated fresh through /products?ids=. Search, sort, category
 * and vehicle-type filters all operate on that real set; Load More reveals it
 * in controlled batches of 8. Empty history → the proper empty state with
 * "Start exploring parts" + Browse All Parts.
 */
export default function RecentlyViewedExplorer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [catNameById, setCatNameById] = useState<Map<string, string>>(new Map());

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [category, setCategory] = useState(ALL);
  const [vehicleType, setVehicleType] = useState(ALL);
  const [visible, setVisible] = useState(BATCH);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const ids = getRecentIds();
      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const [prodData, catData] = await Promise.all([
        api.getProducts({ ids: ids.join(","), limit: "24" }),
        api.getCategoriesFlat().catch(() => ({ categories: [] })),
      ]);
      const byId = new Map<string, any>(
        ((prodData.products || []) as any[]).map((p) => [String(p._id), p])
      );
      // Keep history order (newest first); deleted products simply drop out
      setItems(ids.map((id) => byId.get(id)).filter(Boolean));
      const names = new Map<string, string>();
      ((catData.categories || []) as any[]).forEach((c) =>
        names.set(String(c._id), c.name)
      );
      setCatNameById(names);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Real filter options derived from the loaded history ── */
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((p) => {
      const id = typeof p.category === "string" ? p.category : p.category?._id;
      if (id && !map.has(String(id))) {
        map.set(String(id), catNameById.get(String(id)) || "Category");
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items, catNameById]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((p) => (p.vehicleTypes || []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items.filter((p) => {
      if (q && !`${p.name || ""} ${p.brand || ""}`.toLowerCase().includes(q))
        return false;
      if (category !== ALL) {
        const id = typeof p.category === "string" ? p.category : p.category?._id;
        if (String(id) !== category) return false;
      }
      if (vehicleType !== ALL && !(p.vehicleTypes || []).includes(vehicleType))
        return false;
      return true;
    });
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating")
      list = [...list].sort(
        (a, b) => (b.averageRating || 0) - (a.averageRating || 0)
      );
    return list;
  }, [items, query, sort, category, vehicleType]);

  const shown = filtered.slice(0, visible);
  const hasFilters =
    query.trim() !== "" || category !== ALL || vehicleType !== ALL || sort !== "recent";

  const resetPaging = () => setVisible(BATCH);

  const clearFilters = () => {
    setQuery("");
    setSort("recent");
    setCategory(ALL);
    setVehicleType(ALL);
    resetPaging();
  };

  const handleRemove = (id: string) => {
    removeRecentId(id);
    setItems((prev) => prev.filter((p) => String(p._id) !== id));
    toast.success("Removed from recently viewed");
  };

  const handleClear = () => {
    clearRecentHistory();
    setItems([]);
    toast.success("Recently viewed cleared");
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <>
        <h1 className="vp-page-title">Recently Viewed</h1>
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="vp-card h-72 animate-pulse bg-muted/60" aria-hidden />
          ))}
        </div>
      </>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <>
        <h1 className="vp-page-title">Recently Viewed</h1>
        <div className="vp-empty">
          <p className="vp-empty-title">Could not load your history</p>
          <p className="vp-empty-desc">Something went wrong while loading the products you viewed.</p>
          <button
            type="button"
            onClick={load}
            className="vp-btn min-h-11 rounded-lg border border-border bg-card px-6 text-foreground hover:bg-muted"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  /* ── Real empty state: nothing was ever viewed (or it was cleared) ── */
  if (items.length === 0) {
    return (
      <>
        <h1 className="vp-page-title">Recently Viewed</h1>
        <div className="vp-empty">
          <span className="vp-empty-icon">
            <Clock className="h-6 w-6" aria-hidden />
          </span>
          <p className="vp-empty-title">No recently viewed products</p>
          <p className="vp-empty-desc">Start exploring parts</p>
          <Link href="/products" className="vp-btn-ink min-h-11 px-7">
            Browse All Parts
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Header: title + count + Clear ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="vp-page-title">Recently Viewed</h1>
          <p className="mt-1.5 text-sm text-muted-foreground" aria-live="polite">
            {items.length} {items.length === 1 ? "product" : "products"} you&apos;ve viewed
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="vp-btn min-h-10 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Clear Recently Viewed
        </button>
      </div>

      {/* ── Search + Sort ── */}
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPaging();
            }}
            placeholder="Search within recently viewed…"
            aria-label="Search within recently viewed"
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v);
              resetPaging();
            }}
          >
            <SelectTrigger className="w-[190px] bg-card" aria-label="Sort products">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category filter — options exist only for real categories in history */}
          {categoryOptions.length > 0 && (
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                resetPaging();
              }}
            >
              <SelectTrigger className="w-[170px] bg-card" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Categories</SelectItem>
                {categoryOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Vehicle type filter — options derived from the loaded products */}
          {typeOptions.length > 0 && (
            <Select
              value={vehicleType}
              onValueChange={(v) => {
                setVehicleType(v);
                resetPaging();
              }}
            >
              <SelectTrigger className="w-[190px] bg-card" aria-label="Filter by vehicle type">
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Vehicle Types</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {vehicleTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="vp-btn min-h-11 rounded-lg border border-border bg-card px-4 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="vp-empty">
          <span className="vp-empty-icon">
            <Search className="h-6 w-6" aria-hidden />
          </span>
          <p className="vp-empty-title">No products match your filters</p>
          <p className="vp-empty-desc">
            Your history has {items.length} {items.length === 1 ? "product" : "products"} —
            try clearing the search or filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="vp-btn min-h-11 rounded-lg border border-border bg-card px-6 text-foreground hover:bg-muted"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
            {shown.map((p) => (
              <div key={String(p._id)} className="flex h-full flex-col">
                <ProductCard product={p} className="flex-1" />
                <button
                  type="button"
                  onClick={() => handleRemove(String(p._id))}
                  aria-label={`Remove ${p.name} from recently viewed`}
                  className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 self-start rounded-md px-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              </div>
            ))}
          </div>

          {/* Controlled Load More (8 at a time) */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {shown.length} of {filtered.length}{" "}
              {filtered.length === 1 ? "product" : "products"}
            </p>
            {filtered.length > visible ? (
              <button
                type="button"
                onClick={() => setVisible((v) => v + BATCH)}
                className="vp-btn min-h-11 rounded-lg border border-border bg-card px-7 text-[15px] text-foreground hover:bg-muted"
              >
                Load More
              </button>
            ) : (
              filtered.length > BATCH && (
                <p className="border-t border-border pt-5 text-sm text-muted-foreground">
                  You&apos;ve seen all recently viewed products
                </p>
              )
            )}
          </div>
        </>
      )}
    </>
  );
}
