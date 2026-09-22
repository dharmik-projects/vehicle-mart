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
  Package,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/product/ProductCard";

const vehicleTypeCards = [
  { label: "Cars", value: "car", icon: "🚗", desc: "Sedans, SUVs, Hatchbacks" },
  { label: "Bikes", value: "2-wheeler", icon: "🏍️", desc: "Bikes, Scooters" },
  { label: "Trucks", value: "truck", icon: "🚛", desc: "LCV, HCV" },
  { label: "Tractors", value: "tractor", icon: "🚜", desc: "Farm Equipment" },
  { label: "EVs", value: "ev", icon: "⚡", desc: "Electric Vehicles" },
];

const whyUs = [
  { icon: <ShieldCheck className="h-6 w-6" />, title: "Genuine & Compatible", desc: "OEM and verified aftermarket parts that fit your vehicle." },
  { icon: <BadgeCheck className="h-6 w-6" />, title: "Verified Sellers", desc: "Every seller is vetted for quality and reliability." },
  { icon: <Truck className="h-6 w-6" />, title: "Fast Delivery", desc: "Quick shipping to your doorstep across India." },
  { icon: <RotateCcw className="h-6 w-6" />, title: "Easy Returns", desc: "Hassle-free returns if something isn't right." },
];

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [catData, popData, newData] = await Promise.all([
          api.getCategories(),
          api.getProducts({ limit: 8, sort: "popular" }),
          api.getProducts({ limit: 8, sort: "newest" }),
        ]);
        setCategories(catData.categories || []);
        setProducts(popData.products || []);
        setNewProducts(newData.products || []);
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
    if (search.trim()) {
      router.push(`/products?q=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
              Find the Right Part<br />for Your Vehicle
            </h1>
            <p className="text-blue-100 text-sm sm:text-base mb-8 max-w-lg mx-auto">
              India&apos;s largest marketplace for genuine vehicle spare parts. Compatible parts guaranteed.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto">
              <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-2xl">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by part name, number, or vehicle..."
                    className="border-0 bg-transparent pl-10 text-gray-900 focus-visible:ring-0 h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="shrink-0 rounded-lg px-6">
                  Search
                </Button>
              </div>
            </form>

            {/* Quick vehicle type chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {vehicleTypeCards.map((vt) => (
                <Link
                  key={vt.value}
                  href={`/products?vehicleType=${vt.value}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors backdrop-blur-sm"
                >
                  <span>{vt.icon}</span>
                  <span>{vt.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Popular Products (EARLY on homepage) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Popular Parts</h2>
            <p className="text-sm text-gray-500 mt-0.5">Top-rated parts from verified sellers</p>
          </div>
          <Link href="/products?sort=popular" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-3">
                <Skeleton className="aspect-square rounded-lg mb-3" />
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-4 w-full mb-1.5" />
                <Skeleton className="h-4 w-3/4 mb-3" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No products available yet</p>
          </div>
        )}
      </section>

      {/* ── Shop by Category ── */}
      {categories.length > 0 && (
        <section className="bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shop by Category</h2>
                <p className="text-sm text-gray-500 mt-0.5">Browse parts by category</p>
              </div>
              <Link href="/categories" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {categories.slice(0, 12).map((cat) => (
                <Link key={cat._id} href={`/products?category=${cat._id}`} className="group">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md hover:border-primary/20 transition-all">
                    <span className="text-2xl sm:text-3xl block mb-2">{cat.icon || "📦"}</span>
                    <p className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">{cat.name}</p>
                    {cat.children && cat.children.length > 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{cat.children.length} sub</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Shop by Vehicle ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Find Parts by Vehicle</h2>
            <p className="text-sm text-gray-500 mt-0.5">Select your vehicle type</p>
          </div>
          <Link href="/vehicles" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
            All Vehicles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {vehicleTypeCards.map((v) => (
            <Link key={v.value} href={`/products?vehicleType=${v.value}`} className="group">
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md hover:border-primary/20 transition-all">
                <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{v.icon}</span>
                <p className="text-sm font-semibold text-gray-900">{v.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── New Arrivals ── */}
      {newProducts.length > 0 && (
        <section className="bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">New Arrivals</h2>
                <p className="text-sm text-gray-500 mt-0.5">Latest parts added to the marketplace</p>
              </div>
              <Link href="/products?sort=newest" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {newProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Why VehiclePart ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-8">Why VehiclePart?</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {whyUs.map((item, i) => (
            <div key={i} className="text-center p-4 sm:p-5">
              <div className="text-primary bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                {item.icon}
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{item.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 sm:p-10 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Sell Your Parts on VehiclePart</h2>
          <p className="text-blue-100 text-sm sm:text-base mb-6 max-w-lg mx-auto">
            Reach millions of vehicle owners looking for quality spare parts. Join our marketplace today.
          </p>
          <Link href="/become-seller">
            <Button variant="secondary" size="lg" className="rounded-lg">
              Start Selling Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
