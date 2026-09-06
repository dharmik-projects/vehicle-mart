"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Star, Grid, List, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRICE_PRESETS = [
  { label: "Under \u20B9500", min: "", max: "500" },
  { label: "\u20B9500 \u2013 \u20B91,000", min: "500", max: "1000" },
  { label: "\u20B91,000 \u2013 \u20B92,000", min: "1000", max: "2000" },
  { label: "\u20B92,000 \u2013 \u20B95,000", min: "2000", max: "5000" },
  { label: "\u20B95,000+", min: "5000", max: "" },
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

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [catData, brandData] = await Promise.all([
          api.getCategories(),
          api.getBrands(),
        ]);
        setCategories(catData.categories || []);
        setBrands(brandData.brands || []);
      } catch (err) {
        console.error(err);
      }
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

  const filteredProducts = minRating > 0
    ? products.filter((p) => (p.averageRating || 0) >= minRating)
    : products;

  const FILTER_LABELS: Record<string, string> = {
    q: 'Search',
    category: 'Category',
    brand: 'Brand',
    vehicleType: 'Vehicle',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Mobile filter overlay */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setShowFilters(false)} />
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-72 md:w-64 bg-white md:bg-transparent transform transition-transform duration-200 md:translate-x-0 ${showFilters ? 'translate-x-0' : '-translate-x-full'} md:block`}>
          <div className="h-full overflow-y-auto p-4 md:p-0 md:sticky md:top-20 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="md:hidden text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">Clear all filters</button>
            )}

            {/* Vehicle Type */}
            <div>
              <h4 className="text-sm font-medium mb-2">Vehicle Type</h4>
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
                    className={`block w-full text-left text-sm px-2.5 py-1.5 rounded transition-colors ${
                      filters.vehicleType === vt.value ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-gray-100'
                    }`}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <h4 className="text-sm font-medium mb-2">Category</h4>
              <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand */}
            <div>
              <h4 className="text-sm font-medium mb-2">Brand</h4>
              <Select value={filters.brand} onValueChange={(v) => updateFilter('brand', v)}>
                <SelectTrigger><SelectValue placeholder="All Brands" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Brands</SelectItem>
                  {brands.map((b: any) => (
                    <SelectItem key={b._id} value={b.name}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div>
              <h4 className="text-sm font-medium mb-2">Price Range</h4>
              <div className="flex gap-2 mb-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="text-xs"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="text-xs"
                />
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
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <h4 className="text-sm font-medium mb-2">Customer Rating</h4>
              <div className="space-y-0.5">
                <button
                  onClick={() => setMinRating(0)}
                  className={`block w-full text-left text-sm px-2.5 py-1.5 rounded transition-colors ${
                    minRating === 0 ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-gray-100'
                  }`}
                >
                  All Ratings
                </button>
                {RATING_FILTERS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`flex items-center gap-1.5 w-full text-left text-sm px-2.5 py-1.5 rounded transition-colors ${
                      minRating === r ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span>{r}</span>
                    <Star className={`h-3 w-3 ${minRating === r ? 'fill-white text-white' : 'fill-yellow-400 text-yellow-400'}`} />
                    <span className="text-muted-foreground">&amp; up</span>
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
              <button onClick={() => setShowFilters(!showFilters)} className="md:hidden p-2 border rounded-md hover:bg-gray-50">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{pagination.total || 0}</span> products found
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex border rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-gray-50'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-gray-50'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <Select value={filters.sort} onValueChange={(v) => updateFilter('sort', v)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="best_selling">Best Selling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {activeFilters.map(([key, value]) => (
                <Badge key={key} variant="secondary" className="gap-1 pr-1">
                  {FILTER_LABELS[key] || key}: {value}
                  <button onClick={() => updateFilter(key, '')} className="ml-0.5 hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {minRating > 0 && (
                <Badge variant="secondary" className="gap-1 pr-1">
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
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3' : 'flex flex-col'} gap-4`}>
              {Array(viewMode === 'grid' ? 9 : 4).fill(0).map((_, i) => (
                viewMode === 'grid' ? (
                  <div key={i} className="bg-white rounded-lg border p-3 animate-pulse">
                    <Skeleton className="aspect-square rounded-md mb-3" />
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-4 w-full mb-1.5" />
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <Skeleton className="h-5 w-24 mb-2" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                ) : (
                  <div key={i} className="bg-white rounded-lg border p-4 flex gap-4 animate-pulse">
                    <Skeleton className="w-28 h-28 rounded-md shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-5 w-24 mt-2" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3' : 'flex flex-col'} gap-4`}>
                {filteredProducts.map((product) => (
                  <Link key={product._id} href={`/products/${product.slug}`}>
                    {viewMode === 'grid' ? (
                      <Card className="hover:shadow-md transition-all duration-200 h-full group border-gray-200 hover:border-primary/30">
                        <div className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden relative">
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <span className="text-4xl">📦</span>
                            </div>
                          )}
                          {product.mrp > product.price && (
                            <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5">
                              {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                            </Badge>
                          )}
                          {product.stock <= 0 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-t-lg">
                              <Badge variant="destructive">Out of Stock</Badge>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{product.brand}</p>
                          <h3 className="text-sm font-medium line-clamp-2 mt-1 group-hover:text-primary transition-colors leading-snug">{product.name}</h3>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-base font-bold">{formatPrice(product.price)}</span>
                            {product.mrp > product.price && (
                              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            {product.averageRating > 0 ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs font-medium">{product.averageRating}</span>
                                <span className="text-xs text-muted-foreground">({product.totalReviews})</span>
                              </div>
                            ) : <div />}
                            {product.stock > 0 && product.stock <= 5 && (
                              <span className="text-xs text-orange-500 font-medium">Only {product.stock} left</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="hover:shadow-md transition-all duration-200 group border-gray-200 hover:border-primary/30">
                        <div className="flex gap-4 p-4">
                          <div className="w-28 h-28 bg-gray-50 rounded-md overflow-hidden relative shrink-0">
                            {product.images?.[0]?.url ? (
                              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <span className="text-3xl">📦</span>
                              </div>
                            )}
                            {product.mrp > product.price && (
                              <Badge className="absolute top-1 left-1 bg-red-500 text-white text-[9px] px-1 py-0">
                                {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{product.brand}</p>
                            <h3 className="text-sm font-medium line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">{product.name}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              {product.averageRating > 0 && (
                                <div className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">{product.averageRating}</span>
                                  <span className="text-xs text-muted-foreground">({product.totalReviews})</span>
                                </div>
                              )}
                              {product.stock > 0 && product.stock <= 5 && (
                                <span className="text-xs text-orange-500 font-medium">Only {product.stock} left</span>
                              )}
                            </div>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-base font-bold">{formatPrice(product.price)}</span>
                              {product.mrp > product.price && (
                                <span className="text-xs text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-8">
                  {Number(filters.page) > 1 && (
                    <Button variant="outline" size="sm" onClick={() => updateFilter('page', String(Number(filters.page) - 1))}>
                      Previous
                    </Button>
                  )}
                  {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === Number(filters.page) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateFilter('page', String(page))}
                      className="min-w-[36px]"
                    >
                      {page}
                    </Button>
                  ))}
                  {Number(filters.page) < pagination.totalPages && (
                    <Button variant="outline" size="sm" onClick={() => updateFilter('page', String(Number(filters.page) + 1))}>
                      Next
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-sm text-muted-foreground mb-1 max-w-md mx-auto">
                We couldn&apos;t find any products matching your current filters. Try broadening your search or removing some filters.
              </p>
              <Button onClick={clearFilters} className="mt-4">Clear All Filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-lg" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}
