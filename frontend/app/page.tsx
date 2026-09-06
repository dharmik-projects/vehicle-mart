"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  ShieldCheck,
  BadgeCheck,
  Truck,
  RotateCcw,
  Wrench,
  Disc,
  Gauge,
  Zap,
  Filter,
  Car,
  Bike,
  Bus,
  CircleDot,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const vehicleTypes = [
  { label: "2-Wheeler", value: "2-wheeler", icon: "🏍️", desc: "Bikes, Scooters, Mopeds" },
  { label: "Car", value: "car", icon: "🚗", desc: "Sedans, SUVs, Hatchbacks" },
  { label: "Truck", value: "truck", icon: "🚛", desc: "LCV, MCV, HCV" },
  { label: "Tractor", value: "tractor", icon: "🚜", desc: "Farm Equipment" },
  { label: "EV", value: "ev", icon: "⚡", desc: "Electric Vehicles" },
];

const shopByVehicle = [
  { label: "Cars", value: "car", icon: <Car className="h-8 w-8" /> },
  { label: "Bikes / 2-Wheelers", value: "2-wheeler", icon: <Bike className="h-8 w-8" /> },
  { label: "Trucks", value: "truck", icon: <Bus className="h-8 w-8" /> },
  { label: "Tractors", value: "tractor", icon: <Gauge className="h-8 w-8" /> },
  { label: "EVs", value: "ev", icon: <Zap className="h-8 w-8" /> },
];

const popularCategories = [
  { label: "Engine Parts", icon: <Wrench className="h-6 w-6" />, slug: "engine-parts" },
  { label: "Brake Parts", icon: <Disc className="h-6 w-6" />, slug: "brake-parts" },
  { label: "Clutch Parts", icon: <Gauge className="h-6 w-6" />, slug: "clutch-parts" },
  { label: "Suspension", icon: <CircleDot className="h-6 w-6" />, slug: "suspension" },
  { label: "Electrical", icon: <Zap className="h-6 w-6" />, slug: "electrical" },
  { label: "Filters", icon: <Filter className="h-6 w-6" />, slug: "filters" },
  { label: "Body Parts", icon: <Car className="h-6 w-6" />, slug: "body-parts" },
  { label: "Tyres & Wheels", icon: <CircleDot className="h-6 w-6" />, slug: "tyres-wheels" },
];

const whyUs = [
  { icon: <ShieldCheck className="h-7 w-7" />, title: "Genuine & Compatible Parts", desc: "OEM and verified aftermarket parts that fit your vehicle." },
  { icon: <BadgeCheck className="h-7 w-7" />, title: "Verified Sellers", desc: "Every seller is vetted for quality and reliability." },
  { icon: <Truck className="h-7 w-7" />, title: "Fast Delivery", desc: "Quick shipping to your doorstep across India." },
  { icon: <RotateCcw className="h-7 w-7" />, title: "Easy Returns", desc: "Hassle-free returns if something isn't right." },
];

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [catData, prodData] = await Promise.all([
          api.getCategories(),
          api.getProducts({ limit: 8, sort: "popular" }),
        ]);
        setCategories(catData.categories || []);
        setFeaturedProducts(prodData.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (selectedType) params.set("vehicleType", selectedType);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Find the Right Parts<br />for Your Vehicle
            </h1>
            <p className="text-blue-100 text-base md:text-lg mb-8">
              India&apos;s largest marketplace for genuine vehicle spare parts.
              Compatible parts guaranteed.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex gap-2 bg-white rounded-lg p-1.5 shadow-xl">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by part name, number, or vehicle..."
                    className="border-0 pl-10 text-gray-900"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="shrink-0">
                  Search Parts
                </Button>
              </div>
            </form>

            {/* Vehicle Type Quick Select */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {vehicleTypes.map((vt) => (
                <button
                  key={vt.value}
                  onClick={() => {
                    setSelectedType(vt.value === selectedType ? "" : vt.value);
                    router.push(`/products?vehicleType=${vt.value}`);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedType === vt.value
                      ? "bg-white text-blue-700 shadow-lg"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  <span className="text-lg">{vt.icon}</span>
                  <span>{vt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Vehicle */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Shop by Vehicle</h2>
          <p className="text-muted-foreground text-center mb-8 text-sm">
            Select your vehicle type to find compatible parts
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {shopByVehicle.map((v) => (
              <Link key={v.value} href={`/vehicles`}>
                <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer text-center group">
                  <CardContent className="p-6">
                    <div className="text-primary mb-3 flex justify-center group-hover:scale-110 transition-transform">
                      {v.icon}
                    </div>
                    <p className="text-sm font-semibold">{v.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Part Categories */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Popular Part Categories</h2>
              <p className="text-muted-foreground text-sm mt-1">Browse top categories</p>
            </div>
            <Link href="/categories" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {popularCategories.map((cat) => (
              <Link key={cat.slug} href={`/products?q=${encodeURIComponent(cat.label)}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="text-primary bg-primary/10 p-3 rounded-lg shrink-0">
                      {cat.icon}
                    </div>
                    <p className="text-sm font-medium">{cat.label}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category (from API) */}
      {categories.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">All Categories</h2>
              <Link href="/categories" className="text-sm text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-lg" />
                  ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {categories.slice(0, 12).map((cat) => (
                  <Link key={cat._id} href={`/products?category=${cat._id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4 text-center">
                        <span className="text-3xl mb-2 block">{cat.icon || "📦"}</span>
                        <p className="text-sm font-medium">{cat.name}</p>
                        {cat.children && cat.children.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {cat.children.length} sub-categories
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Popular Products */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Popular Parts</h2>
              <p className="text-muted-foreground text-sm mt-1">Top-rated parts from verified sellers</p>
            </div>
            <Link href="/products?sort=popular" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4">
                    <Skeleton className="h-40 rounded mb-3" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <Link key={product._id} href={`/products/${product.slug}`}>
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                      <h3 className="text-sm font-medium line-clamp-2 mt-1">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-bold">{formatPrice(product.price)}</span>
                        {product.mrp > product.price && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.mrp)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No products yet</p>
              <p className="text-sm mt-1">Check back soon for our featured parts!</p>
            </div>
          )}
        </div>
      </section>

      {/* Why VehiclePart */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Why VehiclePart?</h2>
          <p className="text-muted-foreground text-center mb-10 text-sm">
            Everything you need for your vehicle, in one place
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {whyUs.map((item, i) => (
              <div key={i} className="text-center p-6">
                <div className="text-primary bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-0">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Sell Your Parts on VehiclePart</h2>
              <p className="text-blue-100 mb-6 max-w-lg mx-auto">
                Reach millions of vehicle owners looking for quality spare parts. Join our marketplace today.
              </p>
              <Link href="/become-seller">
                <Button variant="secondary" size="lg">
                  Start Selling Today
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
