"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Star, Grid, List, SlidersHorizontal, X, ChevronDown, Package } from "lucide-react";
import { api } from "@/lib/api";
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

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    vehicleType: searchParams.get('vehicleType') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'popular',
    page: searchParams.get('page') || '1',
  });
  const [minRating, setMinRating] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const data = await api.getProducts(params);
      setProducts(data.products || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catData, brandData] = await Promise.all([api.getCategories(), api.getBrands()]);
        setCategories(catData.categories || []);
        setBrands(brandData.brands || []);
      } catch (err) { console.error(err); }
    };
    loadFilters();
  }, []);

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: '1' };
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    router.push(`/products?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({ q: '', category: '', brand: '', vehicleType: '', minPrice: '', maxPrice: '', sort: 'popular', page: '1' });
    setMinRating(0);
    router.push('/products');
  };

  const activeFilters = Object.entries(filters).filter(([k, v]) => v && k !== 'sort' && k !== 'page');
  const hasActiveFilters = activeFilters.length > 0 || minRating > 0;
  const filteredProducts = minRating > 0 ? products.filter((p) => (p.averageRating || 0) >= minRating) : products;

  const FILTER_LABELS: Record<string, string> = {
    q: 'Search', category: 'Category', brand: 'Brand', vehicleType: 'Vehicle', minPrice: 'Min Price', maxPrice: 'Max Price',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      {/* Mobile filter overlay */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setShowFilters(false)} />
      )}

      {/* Page title */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {filters.q ? `Results for "${filters.q}"` : "All Parts"}
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-72 md:w-60 bg-white md:bg-transparent transform transition-transform duration-200 md:translate-x-0 ${showFilters ? 'translate-x-0' : '-translate-x-full'} md:block`}>
          <div className="h-full overflow-y-auto p-4 md:p-0 md:sticky md:top-24 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-900">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="md:hidden text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">Clear all filters</button>
            )}

            {/* Vehicle Type */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vehicle Type</h4>
              <div className="space-y-0.5">
                {[
                  { label: 'All Types', value: '' },
                  { label: '2-Wheeler', value: '2-wheeler' },
                  { label: 'Car', value: 'car' },
                  { label: 'Truck', value: 'truck' },
                  { label: 'Tractor', value: 'tractor' },
                  { label: 'EV', value: 'ev' },
                ].map(vt => (
                  <button
                    key={vt.value}
                    onClick={() => updateFilter('vehicleType', vt.value)}
                    className={`block w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                      filters.vehicleType === vt.value ? 'bg-primary text-white font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</h4>
              <Select value={filters.category || "__all"} onValueChange={(v) => updateFilter('category', v === '__all' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Brand</h4>
              <Select value={filters.brand || "__all"} onValueChange={(v) => updateFilter('brand', v === '__all' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Brands" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Brands</SelectItem>
                  {brands.map((b: any) => (
                    <SelectItem key={b._id} value={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Price Range</h4>
              <div className="flex gap-2 mb-2">
                <Input type="number" placeholder="Min" value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)} className="text-xs h-9" />
                <Input type="number" placeholder="Max" value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)} className="text-xs h-9" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_PRESETS.map((preset) => {
                  const isActive = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setFilters((f) => ({ ...f, minPrice: preset.min, maxPrice: preset.max, page: '1' }));
                        const params = new URLSearchParams();
                        Object.entries({ ...filters, minPrice: preset.min, maxPrice: preset.max, page: '1' }).forEach(([k, v]) => { if (v) params.set(k, v); });
                        router.push(`/products?${params.toString()}`);
                      }}
                      className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                        isActive ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer Rating</h4>
              <div className="space-y-0.5">
                <button
                  onClick={() => setMinRating(0)}
                  className={`block w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                    minRating === 0 ? 'bg-primary text-white font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Ratings
                </button>
                {RATING_FILTERS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`flex items-center gap-1.5 w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                      minRating === r ? 'bg-primary text-white font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{r}</span>
                    <Star className={`h-3 w-3 ${minRating === r ? 'fill-white text-white' : 'fill-yellow-400 text-yellow-400'}`} />
                    <span className="text-gray-400">&amp; up</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className="md:hidden p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{pagination.total || 0}</span> products
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <Select value={filters.sort} onValueChange={(v) => updateFilter('sort', v)}>
                <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
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
            <div className="flex flex-wrap gap-1.5 mb-4">
              {activeFilters.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="gap-1 pr-1 text-xs rounded-md">
                  {FILTER_LABELS[key] || key}: {value}
                  <button onClick={() => updateFilter(key, '')} className="ml-0.5 hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {minRating > 0 && (
                <Badge variant="secondary" className="gap-1 pr-1 text-xs rounded-md">
                  Rating: {minRating}★ &amp; up
                  <button onClick={() => setMinRating(0)} className="ml-0.5 hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Products */}
          {loading ? (
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3' : 'flex flex-col'} gap-3 sm:gap-4`}>
              {Array(viewMode === 'grid' ? 9 : 4).fill(0).map((_, i) => (
                viewMode === 'grid' ? (
                  <div key={i} className="bg-white rounded-lg border p-3">
                    <Skeleton className="aspect-square rounded-lg mb-3" />
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-4 w-full mb-1.5" />
                    <Skeleton className="h-5 w-20 mt-2" />
                  </div>
                ) : (
                  <div key={i} className="bg-white rounded-lg border p-4 flex gap-4">
                    <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-5 w-24 mt-2" />
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3' : 'flex flex-col'} gap-3 sm:gap-4`}>
                {filteredProducts.map((product) => (
                  viewMode === 'grid' ? (
                    <ProductCard key={product._id} product={product} />
                  ) : (
                    <Link key={product._id} href={`/products/${product.slug}`} className="group">
                      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 hover:shadow-md transition-all hover:border-primary/20">
                        <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-gray-300" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-gray-400 uppercase tracking-wider">{product.brand}</p>
                          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">{product.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            {product.averageRating > 0 && (
                              <div className="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded">
                                <span className="text-xs font-semibold text-green-700">{product.averageRating}</span>
                                <Star className="h-3 w-3 fill-green-600 text-green-600" />
                              </div>
                            )}
                            {product.stock > 0 && product.stock <= 5 && (
                              <span className="text-[11px] text-orange-600 font-medium">Only {product.stock} left</span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
                            {product.mrp > product.price && (
                              <span className="text-xs text-gray-400 line-through">{formatPrice(product.mrp)}</span>
                            )}
                            {product.mrp > product.price && (
                              <span className="text-xs text-green-600 font-medium">{Math.round((1 - product.price / product.mrp) * 100)}% off</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-8">
                  {Number(filters.page) > 1 && (
                    <Button variant="outline" size="sm" onClick={() => updateFilter('page', String(Number(filters.page) - 1))} className="rounded-lg">
                      Previous
                    </Button>
                  )}
                  {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === Number(filters.page) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateFilter('page', String(page))}
                      className="min-w-[36px] rounded-lg"
                    >
                      {page}
                    </Button>
                  ))}
                  {Number(filters.page) < pagination.totalPages && (
                    <Button variant="outline" size="sm" onClick={() => updateFilter('page', String(Number(filters.page) + 1))} className="rounded-lg">
                      Next
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No products found</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                Try broadening your search or removing some filters.
              </p>
              <Button onClick={clearFilters} variant="outline" className="rounded-lg">Clear All Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4"><Skeleton className="h-7 w-48" /><Skeleton className="h-96 rounded-xl" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}
