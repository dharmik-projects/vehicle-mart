"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  LogOut,
  Shield,
  ChevronDown,
  LayoutDashboard,
  Store,
} from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { totalItems, loadCart } = useCartStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenu(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      setSearchLoading(true);
      const data = await api.getProducts({ q: query.trim(), limit: "6" });
      setSuggestions(data.products || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    }
    setSearchLoading(false);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSuggestions(false);
      setMobileMenu(false);
    }
  };

  const handleSuggestionClick = (slug: string) => {
    router.push(`/products/${slug}`);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  // ── Admin Header ──
  if (isAdmin) {
    return (
      <header className="sticky top-0 z-50 w-full">
        <div className="bg-gray-900 text-white text-xs py-1.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Admin Dashboard
            </span>
            <span className="hidden sm:inline">VehiclePart Platform Administration</span>
          </div>
        </div>
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex h-14 items-center justify-between">
              <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-gray-900">
                <span className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm">VP</span>
                <span className="hidden sm:inline">VehiclePart</span>
                <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border">Admin</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link href="/admin">
                  <Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard</Button>
                </Link>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenu(!userMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-gray-900 text-white flex items-center justify-center">
                      <span className="text-xs font-medium">{user?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <span className="hidden sm:block text-gray-700">{user?.name?.split(" ")[0]}</span>
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  </button>
                  {userMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 scale-in">
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm font-medium">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                        <Link href="/admin/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenu(false)}>
                          <Shield className="h-4 w-4 text-gray-400" /> Admin Profile
                        </Link>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600" onClick={() => { logout(); setUserMenu(false); router.push("/"); }}>
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // ── Regular / Seller Header ──
  const vehicleTypes = [
    { label: "All", value: "" },
    { label: "2-Wheeler", value: "2-wheeler" },
    { label: "Car", value: "car" },
    { label: "Truck", value: "truck" },
    { label: "Tractor", value: "tractor" },
    { label: "EV", value: "ev" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b">
      {/* Promo bar */}
      <div className="bg-primary text-primary-foreground text-[11px] py-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center">
          <span>Free shipping on orders above ₹500</span>
          <span className="hidden sm:inline">India&apos;s #1 Vehicle Spare Parts Marketplace</span>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex h-14 sm:h-16 items-center gap-3 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">VP</span>
            <span className="hidden sm:block text-lg font-bold text-gray-900">VehiclePart</span>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="flex-1 max-w-2xl relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search parts, brands, OEM numbers..."
                  className="pl-10 pr-4 h-10 bg-gray-50 border-gray-200 rounded-lg text-sm focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  autoComplete="off"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </form>

            {/* Search suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto scale-in">
                {suggestions.map((p: any) => (
                  <button
                    key={p._id}
                    onClick={() => handleSuggestionClick(p.slug)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{formatPrice(p.price)}</span>
                        {p.averageRating > 0 && (
                          <span className="text-xs text-gray-400">★ {p.averageRating}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                <Link
                  href={`/products?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => { setShowSuggestions(false); setSearchQuery(""); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-gray-50 border-t"
                >
                  <Search className="h-3.5 w-3.5" />
                  View all results for &ldquo;{searchQuery}&rdquo;
                </Link>
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            <Link href="/products" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors">
              All Parts
            </Link>
            <Link href="/vehicles" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors">
              By Vehicle
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <Link href="/wishlist" className="hidden sm:flex p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors" title="Wishlist">
              <Heart className="h-5 w-5" />
            </Link>
            <Link href="/cart" className="relative p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors" title="Cart">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-semibold text-white flex items-center justify-center px-1">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="hidden lg:block">{user.name.split(" ")[0]}</span>
                  <ChevronDown className="h-3 w-3 text-gray-400 hidden sm:block" />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 scale-in">
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Link href="/orders" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenu(false)}>
                        <ShoppingCart className="h-4 w-4 text-gray-400" /> My Orders
                      </Link>
                      <Link href="/wishlist" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenu(false)}>
                        <Heart className="h-4 w-4 text-gray-400" /> Wishlist
                      </Link>
                      <Link href="/profile" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenu(false)}>
                        <User className="h-4 w-4 text-gray-400" /> Profile
                      </Link>
                      {user.role === "seller" && (
                        <Link href="/seller" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenu(false)}>
                          <Store className="h-4 w-4 text-gray-400" /> Seller Dashboard
                        </Link>
                      )}
                      {user.role === "user" && (
                        <Link href="/become-seller" className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenu(false)}>
                          <Shield className="h-4 w-4 text-gray-400" /> Become a Seller
                        </Link>
                      )}
                      <div className="border-t mt-1 pt-1">
                        <button
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                          onClick={() => { logout(); setUserMenu(false); router.push("/"); }}
                        >
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
                  <User className="h-4 w-4 mr-1" /> Login
                </Button>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle menu"
            >
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle type bar - desktop */}
      <div className="hidden md:block border-t bg-gray-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 py-1.5">
            {vehicleTypes.map((vt) => (
              <Link
                key={vt.value}
                href={vt.value ? `/products?vehicleType=${vt.value}` : "/products"}
                className="px-3 py-1 text-xs font-medium text-gray-600 rounded-full hover:bg-primary hover:text-white whitespace-nowrap transition-colors border border-transparent hover:border-primary"
              >
                {vt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden border-t bg-white shadow-lg scale-in">
          <div className="px-4 py-3 space-y-1">
            {/* Search on mobile */}
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search parts..."
                  className="w-full pl-10 pr-4 h-10 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            <Link href="/products" className="block py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenu(false)}>
              All Parts
            </Link>
            <Link href="/vehicles" className="block py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenu(false)}>
              By Vehicle
            </Link>
            <Link href="/categories" className="block py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenu(false)}>
              Categories
            </Link>
            <Link href="/wishlist" className="block py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenu(false)}>
              Wishlist
            </Link>
            <Link href="/cart" className="block py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenu(false)}>
              Cart {totalItems > 0 && <span className="text-primary">({totalItems})</span>}
            </Link>
            <Link href="/orders" className="block py-2.5 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setMobileMenu(false)}>
              My Orders
            </Link>

            {/* Vehicle types on mobile */}
            <div className="pt-2 mt-2 border-t">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2">Shop by Vehicle</p>
              {vehicleTypes.filter(v => v.value).map((vt) => (
                <Link
                  key={vt.value}
                  href={`/products?vehicleType=${vt.value}`}
                  className="block py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  onClick={() => setMobileMenu(false)}
                >
                  {vt.label}
                </Link>
              ))}
            </div>

            {!user && (
              <div className="pt-2 border-t">
                <Link href="/login" onClick={() => setMobileMenu(false)}>
                  <Button className="w-full" size="sm">Login / Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
