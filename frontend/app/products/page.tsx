"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, Grid, List, SlidersHorizontal, X, Package, Loader2, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { thumbUrl } from "@/lib/images";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/product/ProductCard";

const PRICE_PRESETS = [
  { label: "Under ₹500", min: "", max: "500" },
  { label: "₹500 – ₹1,000", min: "500", max: "1000" },
  { label: "₹1,000 – ₹2,000", min: "1000", max: "2000" },
  { label: "₹2,000 – ₹5,000", min: "2000", max: "5000" },
  { label: "₹5,000+", min: "5000", max: "" },
];

const RATING_FILTERS = [4, 3, 2, 1];

/** Controlled batch size — the catalog loads 8 products at a time. */
const PAGE_SIZE = 8;

const VEHICLE_TYPES = [
  { label: "All Types", value: "" },
  { label: "2-Wheeler", value: "2-wheeler" },
  { label: "Car", value: "car" },
  { label: "Truck", value: "truck" },
  { label: "Tractor", value: "tractor" },
  { label: "EV", value: "ev" },
  { label: "3-Wheeler", value: "three-wheeler" },
  { label: "Bus", value: "bus" },
];

/* System/role entries that must never appear as shop categories */
const SYSTEM_CATEGORY_RE =
  /^(user|users|seller|sellers|admin|admins|role|roles|system|systems)$/i;
const isPartCategory = (cat: any) =>
  !!cat?.name && !SYSTEM_CATEGORY_RE.test(cat.name.trim());

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  car: "Car",
  "2-wheeler": "2-Wheeler",
  truck: "Truck",
  tractor: "Tractor",
  ev: "EV",
  "three-wheeler": "3-Wheeler",
  bus: "Bus",
};

interface Filters {
  q: string;
  category: string;
  brand: string;
  vehicleType: string;
  vehicleBrand: string;
  minPrice: string;
  maxPrice: string;
  rating: string;
  inStock: string;
  vehicleModel: string;
  vehicleVariant: string;
  year: string;
  seller: string;
  sort: string;
}

/* Filters ⇄ query string, in ONE canonical form (sorted keys, empty values
   dropped) so the URL, the local state and lastPushedRef can be compared
   without tripping over key order or `?q=` vs no `q` at all. */
const filtersFromSearch = (search: string): Filters => {
  const sp = new URLSearchParams(search);
  const get = (k: string) => sp.get(k) || "";
  return {
    q: get("q"),
    category: get("category"),
    brand: get("brand"),
    vehicleType: get("vehicleType"),
    vehicleBrand: get("vehicleBrand"),
    minPrice: get("minPrice"),
    maxPrice: get("maxPrice"),
    rating: get("rating"),
    inStock: get("inStock"),
    vehicleModel: get("vehicleModel"),
    vehicleVariant: get("vehicleVariant"),
    year: get("year"),
    seller: get("seller"),
    sort: get("sort") || (get("q") ? "relevance" : "popular"),
  };
};

const filtersToSearch = (f: Filters): string => {
  const sp = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v) sp.set(k, v); });
  sp.sort();
  return sp.toString();
};

const canonicalSearch = (search: string): string =>
  filtersToSearch(filtersFromSearch(search));

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [productBrands, setProductBrands] = useState<string[]>([]);
  const [vehicleMakes, setVehicleMakes] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<Filters>(() => filtersFromSearch(searchParams.toString()));
  /* Canonical query string of the last URL *this page* pushed itself — lets the
     sync effect tell our own writes apart from external ones (header search,
     browser back/forward). */
  const lastPushedRef = useRef("");
  /* Canonical query string of the last URL we parsed into filter state — the
     loop guard: we only re-parse when the URL actually moved on. */
  const appliedSearchRef = useRef("");
  /* Monotonic load counter: a response is applied only if no newer load has
     started since (stale-response guard for refreshes and page changes). */
  const fetchSeqRef = useRef(0);
  /* The in-flight request keyed by its canonical query — identical re-triggers
     (effect re-fire, StrictMode) are dropped instead of double-fetched. */
  const inFlightRef = useRef<{ key: string; seq: number } | null>(null);
  /* Price inputs edit a draft — commit on blur/Enter so typing never refetches. */
  const [priceDraft, setPriceDraft] = useState({ min: filters.minPrice, max: filters.maxPrice });
  useEffect(() => {
    setPriceDraft({ min: filters.minPrice, max: filters.maxPrice });
  }, [filters.minPrice, filters.maxPrice]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadProducts = useCallback(async () => {
    const key = filtersToSearch(filters);
    const inflight = inFlightRef.current;
    /* Same request already running and still the newest one — don't start a
       second identical fetch (page changes always get a new key, so they are
       never dropped: the newest load supersedes via the seq counter). */
    if (inflight && inflight.key === key && inflight.seq === fetchSeqRef.current) return;
    const seq = ++fetchSeqRef.current;
    inFlightRef.current = { key, seq };
    setLoading(true);
    setError(null);
    setMoreError(null);
    try {
      const params: any = { limit: String(PAGE_SIZE) };
      Object.entries(filters).forEach(([key2, value]) => {
        if (value) params[key2] = value;
      });
      const data = await api.getProducts(params);
      if (seq !== fetchSeqRef.current) return; // stale response — a newer load owns the UI
      setProducts(data.products || []); // page refreshes always replace the list
      setPagination(data.pagination || {});
    } catch (err: any) {
      if (seq !== fetchSeqRef.current) return;
      setError(err?.message || 'Could not load products.');
      setProducts([]);
    } finally {
      if (inFlightRef.current?.seq === seq) inFlightRef.current = null;
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  /* ── Load More — fetches the next batch of PAGE_SIZE and APPENDS it.
      A seq guard ties the response to the filter-generation it started in,
      so changing a filter mid-flight drops the stale append instead of
      mixing lists. Duplicates are dropped by id. ── */
  const loadMoreRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadMoreRef.current || loading) return;
    const seq = fetchSeqRef.current;
    loadMoreRef.current = true;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const nextPage = (pagination.page || 1) + 1;
      const params: any = { limit: String(PAGE_SIZE), page: String(nextPage) };
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const data = await api.getProducts(params);
      if (seq !== fetchSeqRef.current) return; // filters changed mid-flight
      const incoming: any[] = data.products || [];
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => String(p._id)));
        const fresh = incoming.filter((p) => p?._id && !seen.has(String(p._id)));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      setPagination((prev: any) => {
        const meta = data.pagination || prev || {};
        // Defensive: a page that returns nothing ends the list even if the
        // backend meta still claims otherwise.
        if (incoming.length === 0) return { ...meta, hasNextPage: false };
        return meta;
      });
    } catch (err: any) {
      if (seq === fetchSeqRef.current) {
        setMoreError(err?.message || "Could not load more products.");
      }
    } finally {
      loadMoreRef.current = false;
      if (seq === fetchSeqRef.current) setLoadingMore(false);
    }
  }, [filters, loading, pagination.page]);

  /* Sync FROM the URL — header search while already on /products, browser
     back/forward or any other external navigation re-parses into filter state
     and reloads. Keys are compared in canonical form (defaults applied, key
     order normalised) so our own writes never re-enter this effect. */
  const urlSearch = searchParams.toString();
  useEffect(() => {
    const urlKey = canonicalSearch(urlSearch);
    const filtersKey = filtersToSearch(filters);
    if (urlKey === filtersKey) {
      appliedSearchRef.current = urlKey; // already in sync
      return;
    }
    if (urlKey === lastPushedRef.current) return; // our own push — the matching filters land in this batch
    if (urlKey === appliedSearchRef.current) return; // this URL was already parsed; wait for state to catch up
    appliedSearchRef.current = urlKey;
    lastPushedRef.current = ''; // the URL we pushed earlier is no longer the current one
    setFilters(filtersFromSearch(urlSearch));
  }, [urlSearch, filters]);

  /* Filter options: shop categories, real product brands, vehicle makes */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [catData, brandData, makeData, sellerData] = await Promise.all([
          cached("categories", () => api.getCategories()),
          cached("productBrands", () => api.fetch('/products/brands')),
          cached("vehicleMakes", () => api.getBrands()),
          cached("productSellers", () => api.fetch('/products/sellers')),
        ]);
        if (!alive) return;
        setCategories(((catData.categories || []) as any[]).filter(isPartCategory));
        setProductBrands(brandData.brands || []);
        setVehicleMakes(makeData.brands || []);
        setSellers(sellerData.sellers || []);
      } catch (err) {
        if (!alive) return;
        console.error(err);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* Write the next filters to the URL *without* an App Router navigation:
     window.history.replaceState keeps useSearchParams in sync (Next 14.2) and
     the local state update triggers the reload immediately — the grid stays
     interactive instead of blanking for an RSC round-trip. */
  const applyFilters = (next: Filters) => {
    const qs = filtersToSearch(next);
    lastPushedRef.current = qs; // record before the sync effect can see the new URL
    window.history.replaceState(null, '', qs ? `/products?${qs}` : '/products');
    setFilters(next);
    setLoading(true); // instant feedback: dim + "Updating…" (or skeleton if empty)
  };

  const updateFilter = (key: string, value: string) => {
    let patch: Record<string, string> = { [key]: value };
    /* Changing vehicle type/make invalidates narrower vehicle selections */
    if (key === 'vehicleType') patch = { ...patch, vehicleBrand: '', vehicleModel: '', vehicleVariant: '' };
    if (key === 'vehicleBrand') patch = { ...patch, vehicleModel: '', vehicleVariant: '' };
    applyFilters({ ...filters, ...patch }); // any change restarts from the first batch
  };

  const updateFilters = (patch: Partial<Filters>) => {
    applyFilters({ ...filters, ...patch });
  };

  const clearFilters = () => {
    applyFilters({
      q: '', category: '', brand: '', vehicleType: '', vehicleBrand: '',
      vehicleModel: '', vehicleVariant: '', year: '', seller: '',
      minPrice: '', maxPrice: '', rating: '', inStock: '', sort: 'popular',
    });
  };

  /* vehicleModel/vehicleVariant are hidden — their values are raw ObjectIds */
  const activeFilters = Object.entries(filters).filter(
    ([k, v]) => v && k !== 'sort' && k !== 'q'
      && k !== 'vehicleModel' && k !== 'vehicleVariant'
  );
  const hasActiveFilters = activeFilters.length > 0;

  const categoryLabel = (id: string) => {
    for (const c of categories as any[]) {
      if (c._id === id) return c.name;
      const child = (c.children || []).find((ch: any) => ch._id === id);
      if (child) return child.name;
    }
    return id;
  };
  const makeLabel = (id: string) =>
    vehicleMakes.find((m: any) => m._id === id)?.name || id;
  const sellerLabel = (id: string) =>
    sellers.find((s: any) => s._id === id)?.name || id;

  const FILTER_LABELS: Record<string, string> = {
    category: 'Category', brand: 'Brand', vehicleType: 'Vehicle',
    vehicleBrand: 'Vehicle Make', minPrice: 'Min Price', maxPrice: 'Max Price',
    rating: 'Rating', inStock: 'Availability', seller: 'Seller', year: 'Year',
  };

  const filterValueLabel = (key: string, value: string) => {
    if (key === 'category') return categoryLabel(value);
    if (key === 'vehicleBrand') return makeLabel(value);
    if (key === 'seller') return sellerLabel(value);
    if (key === 'vehicleType') return VEHICLE_TYPE_LABELS[value] || value;
    if (key === 'rating') return `${value}★ & up`;
    if (key === 'inStock') return 'In stock only';
    return value;
  };

  const selectedCategoryName = filters.category ? categoryLabel(filters.category) : '';

  const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h4 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );

  return (
    <div className="vp-wide py-6 sm:py-8 fade-in">
      {/* Mobile filter overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setShowFilters(false)} />
      )}

      {/* Page title */}
      <div className="mb-4 min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground break-words sm:text-2xl">
          {filters.q ? <>Results for “{filters.q}”</> : selectedCategoryName ? selectedCategoryName : "All Parts"}
        </h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {loading && products.length === 0
            ? "Loading…"
            : `${pagination.total || 0} ${pagination.total === 1 ? "product" : "products"}`}
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Filters Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[86vw] max-w-xs border-r border-border bg-card transition-transform duration-200 lg:sticky lg:top-20 lg:z-auto lg:block lg:w-56 lg:shrink-0 lg:translate-x-0 lg:border lg:rounded-lg ${
            showFilters ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full space-y-4 overflow-y-auto p-4 lg:max-h-[calc(100vh-6rem)] lg:p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-foreground">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex min-h-10 items-center text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                Clear all filters
              </button>
            )}

            {/* Vehicle Type */}
            <FilterSection title="Vehicle Type">
              <div className="space-y-0.5">
                {VEHICLE_TYPES.map(vt => (
                  <button
                    key={vt.value}
                    onClick={() => updateFilter('vehicleType', vt.value)}
                    className={`flex min-h-10 w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                      filters.vehicleType === vt.value
                        ? 'bg-primary font-medium text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Category */}
            <FilterSection title="Category">
              <Select value={filters.category || "__all"} onValueChange={(v) => updateFilter('category', v === '__all' ? '' : v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Categories</SelectItem>
                  {categories.flatMap((cat: any) => [
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>,
                    ...(cat.children ?? []).map((ch: any) => (
                      <SelectItem key={ch._id} value={ch._id}>└ {ch.name}</SelectItem>
                    )),
                  ])}
                </SelectContent>
              </Select>
            </FilterSection>

            {/* Product Brand */}
            <FilterSection title="Brand">
              <Select value={filters.brand || "__all"} onValueChange={(v) => updateFilter('brand', v === '__all' ? '' : v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All Brands" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Brands</SelectItem>
                  {productBrands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            {/* Vehicle Make (compatibility) */}
            <FilterSection title="Vehicle Make">
              <Select value={filters.vehicleBrand || "__all"} onValueChange={(v) => updateFilter('vehicleBrand', v === '__all' ? '' : v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Any Make" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any Make</SelectItem>
                  {vehicleMakes.map((m: any) => (
                    <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            {/* Seller */}
            <FilterSection title="Seller">
              <Select value={filters.seller || "__all"} onValueChange={(v) => updateFilter('seller', v === '__all' ? '' : v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="All Sellers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Sellers</SelectItem>
                  {sellers.map((s: any) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            {/* Price Range */}
            <FilterSection title="Price Range">
              <div className="mb-2 flex gap-2">
                <Input
                  type="number" placeholder="Min" value={priceDraft.min}
                  onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
                  onBlur={() => updateFilters({ minPrice: priceDraft.min, maxPrice: priceDraft.max })}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateFilters({ minPrice: priceDraft.min, maxPrice: priceDraft.max }); }}
                  className="text-sm"
                  aria-label="Minimum price"
                />
                <Input
                  type="number" placeholder="Max" value={priceDraft.max}
                  onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
                  onBlur={() => updateFilters({ minPrice: priceDraft.min, maxPrice: priceDraft.max })}
                  onKeyDown={(e) => { if (e.key === 'Enter') updateFilters({ minPrice: priceDraft.min, maxPrice: priceDraft.max }); }}
                  className="text-sm"
                  aria-label="Maximum price"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_PRESETS.map((preset) => {
                  const isActive = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => updateFilters({ minPrice: preset.min, maxPrice: preset.max })}
                      className={`min-h-10 rounded-md border px-3 py-2 text-xs transition-colors ${
                        isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </FilterSection>

            {/* Rating */}
            <FilterSection title="Customer Rating">
              <div className="space-y-0.5">
                <button
                  onClick={() => updateFilter('rating', '')}
                  className={`flex min-h-10 w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                    !filters.rating ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  All Ratings
                </button>
                {RATING_FILTERS.map((r) => (
                  <button
                    key={r}
                    onClick={() => updateFilter('rating', String(r))}
                    className={`flex w-full min-h-10 items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                      filters.rating === String(r) ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{r}</span>
                    <Star className={`h-3 w-3 ${filters.rating === String(r) ? 'fill-current text-current' : 'fill-warning text-warning'}`} />
                    <span className="opacity-70">&amp; up</span>
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Availability */}
            <FilterSection title="Availability">
              <div className="space-y-0.5">
                <button
                  onClick={() => updateFilter('inStock', '')}
                  className={`flex min-h-10 w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                    !filters.inStock ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  Show all
                </button>
                <button
                  onClick={() => updateFilter('inStock', 'true')}
                  className={`flex min-h-10 w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                    filters.inStock === 'true' ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  In stock only
                </button>
              </div>
            </FilterSection>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <div className="flex flex-1 items-center justify-end gap-2">
              <div className="hidden overflow-hidden rounded-lg border border-border md:flex">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <Select value={filters.sort} onValueChange={(v) => updateFilter('sort', v)}>
                <SelectTrigger className="min-w-0 text-sm sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {activeFilters.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="min-h-10 gap-1 rounded-md pl-3 pr-0 text-xs">
                  <span className="min-w-0 break-words py-1">{FILTER_LABELS[key] || key}: {filterValueLabel(key, value as string)}</span>
                  <button onClick={() => updateFilter(key, '')} aria-label={`Remove ${FILTER_LABELS[key] || key} filter`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Products — skeleton only when there is nothing to show yet; a
              refresh keeps the previous results on screen (dimmed) instead of
              blanking the grid. */}
          {loading && products.length === 0 ? (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6 2xl:grid-cols-4' : 'flex flex-col gap-3'}`}>
              {Array(viewMode === 'grid' ? PAGE_SIZE : 4).fill(0).map((_, i) => (
                viewMode === 'grid' ? (
                  <div key={i} className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
                    <Skeleton className="aspect-[4/3] rounded-none" />
                    <div className="space-y-2.5 p-3.5">
                      <Skeleton className="h-2.5 w-14" />
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-full rounded-lg" />
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-4 rounded-lg border border-border bg-card p-4">
                    <Skeleton className="h-24 w-24 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : error ? (
            <div className="vp-empty">
              <span className="vp-empty-icon"><Package className="h-6 w-6" /></span>
              <p className="vp-empty-title">Couldn&apos;t load products</p>
              <p className="vp-empty-desc">{error}</p>
              <Button variant="outline" onClick={loadProducts}>Try again</Button>
            </div>
          ) : products.length > 0 ? (
            <>
              {loading && (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
                </p>
              )}
              <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6 2xl:grid-cols-4' : 'flex flex-col gap-3'}${loading ? ' opacity-60 transition-opacity' : ' transition-opacity'}`}>
                {products.map((product) => (
                  viewMode === 'grid' ? (
                    <ProductCard key={product._id} product={product} />
                  ) : (
                    <Link key={product._id} href={`/products/${product.slug}`} className="group">
                      <div className="vp-card vp-card-hover flex gap-3 p-4 transition-colors sm:gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24">
                          {product.images?.[0]?.url ? (
                            <img src={thumbUrl(product.images[0].url, 320)} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/50" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.brand}</p>
                          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-medium text-foreground group-hover:underline">{product.name}</h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {product.averageRating > 0 && (
                              <div className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5">
                                <span className="text-xs font-semibold text-foreground">{product.averageRating}</span>
                                <Star className="h-3 w-3 fill-warning text-warning" />
                              </div>
                            )}
                            {product.stock > 0 && product.stock <= 5 && (
                              <span className="text-xs font-medium text-warning">Only {product.stock} left</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
                            {product.mrp > product.price && (
                              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
                            )}
                            {product.mrp > product.price && (
                              <span className="text-xs font-medium text-success">{Math.round((1 - product.price / product.mrp) * 100)}% off</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                ))}
              </div>

              {/* Controlled loading — Load More (8 at a time) */}
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing {products.length}
                  {pagination.total > 0 ? ` of ${pagination.total}` : ""}{" "}
                  {pagination.total === 1 ? "product" : "products"}
                </p>
                {moreError ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-destructive">{moreError}</p>
                    <Button variant="outline" className="min-h-11 px-6" onClick={loadMore}>
                      Retry
                    </Button>
                  </div>
                ) : pagination.hasNextPage ? (
                  <Button
                    variant="outline"
                    className="min-h-11 gap-1.5 px-7 text-[15px]"
                    onClick={loadMore}
                    disabled={loading || loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </>
                    ) : (
                      <>
                        Load More <ChevronDown className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="border-t border-border pt-5 text-sm text-muted-foreground">
                    You&apos;ve seen all products
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="vp-empty">
              <span className="vp-empty-icon"><Package className="h-6 w-6" /></span>
              <p className="vp-empty-title">No products found</p>
              <p className="vp-empty-desc">Try broadening your search or removing some filters.</p>
              <Button onClick={clearFilters} variant="outline">Clear All Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="vp-wide space-y-4 py-6 fade-in"><Skeleton className="h-7 w-48" /><Skeleton className="h-96" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}
