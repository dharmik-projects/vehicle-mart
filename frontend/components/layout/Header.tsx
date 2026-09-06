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
  Clock,
  TrendingUp,
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

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    }
  };

  const handleSuggestionClick = (slug: string) => {
    router.push(`/products/${slug}`);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  // Admin header
  if (isAdmin) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="bg-gray-900 text-white text-xs py-1.5">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Admin Dashboard
            </span>
            <span>VehiclePart Platform Administration</span>
          </div>
        </div>
        <div className="container mx-auto px-4">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-lg text-primary">
              <span className="text-xl sm:text-2xl">🔧</span>
              <span>VehiclePart</span>
              <span className="text-xs font-normal bg-gray-900 text-white px-2 py-0.5 rounded-full">Admin</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="ghost" size="sm"><LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard</Button>
              </Link>
              <div className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-gray-900/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-900">{user?.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <span className="hidden sm:block">{user?.name?.split(" ")[0]}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border py-1 z-50">
                      <div className="px-3 py-2 border-b">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Administrator</p>
                      </div>
                      <Link
                        href="/admin/settings"
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setUserMenu(false)}
                      >
                        <Shield className="h-4 w-4" /> Admin Profile
                      </Link>
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent w-full text-left text-red-600"
                        onClick={() => { logout(); setUserMenu(false); router.push("/"); }}
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Regular user / seller header
  const vehicleTypes = [
    { label: "All", value: "" },
    { label: "🏍️ 2-Wheeler", value: "2-wheeler" },
    { label: "🚗 Car", value: "car" },
    { label: "🚛 Truck", value: "truck" },
    { label: "🚜 Tractor", value: "tractor" },
    { label: "⚡ EV", value: "ev" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1.5">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <span className="hidden sm:inline">Free shipping on orders above ₹500</span>
          <span className="sm:hidden">Free shipping above ₹500</span>
          <span className="hidden md:inline">India&apos;s #1 Vehicle Spare Parts Marketplace</span>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4">
        <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary shrink-0">
            <span className="text-xl sm:text-2xl">🔧</span>
            <span className="hidden sm:block">VehiclePart</span>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="flex-1 max-w-xl relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search parts, brands, OEM numbers..."
                  className="pl-10 pr-4 text-sm"
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
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-80 overflow-y-auto">
                {suggestions.map((p: any) => (
                  <button
                    key={p._id}
                    onClick={() => handleSuggestionClick(p.slug)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-gray-50 rounded overflow-hidden shrink-0">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">{formatPrice(p.price)}</span>
                        {p.averageRating > 0 && (
                          <span className="text-xs text-muted-foreground">★ {p.averageRating}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                <Link
                  href={`/products?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => { setShowSuggestions(false); setSearchQuery(""); }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent border-t"
                >
                  <Search className="h-3.5 w-3.5" />
                  View all results for &ldquo;{searchQuery}&rdquo;
                </Link>
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/products" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">
              All Parts
            </Link>
            <Link href="/vehicles" className="px-3 py-2 text-sm font-medium hover:text-primary transition-colors">
              By Vehicle
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link href="/wishlist" className="hidden sm:flex p-2 hover:bg-accent rounded-md transition-colors">
              <Heart className="h-5 w-5" />
            </Link>
            <Link href="/cart" className="p-2 hover:bg-accent rounded-md relative transition-colors">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="hidden lg:block">{user.name.split(" ")[0]}</span>
                  <ChevronDown className="h-3 w-3 hidden sm:block" />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border py-1 z-50">
                      <div className="px-3 py-2 border-b">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Link
                        href="/orders"
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setUserMenu(false)}
                      >
                        <ShoppingCart className="h-4 w-4" /> My Orders
                      </Link>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => setUserMenu(false)}
                      >
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      {user.role === "seller" && (
                        <Link
                          href="/seller"
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setUserMenu(false)}
                        >
                          <Shield className="h-4 w-4" /> Seller Dashboard
                        </Link>
                      )}
                      {user.role === "user" && (
                        <Link
                          href="/become-seller"
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setUserMenu(false)}
                        >
                          <Shield className="h-4 w-4" /> Become a Seller
                        </Link>
                      )}
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent w-full text-left text-red-600"
                        onClick={() => {
                          logout();
                          setUserMenu(false);
                          router.push("/");
                        }}
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-1" /> Login
                </Button>
              </Link>
            )}

            <button
              className="md:hidden p-2 hover:bg-accent rounded-md"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle menu"
            >
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle type bar */}
      <div className="border-t bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar">
            {vehicleTypes.map((vt) => (
              <Link
                key={vt.value}
                href={vt.value ? `/products?vehicleType=${vt.value}` : "/products"}
                className="px-3 py-1 text-xs font-medium rounded-full border hover:bg-primary hover:text-primary-foreground whitespace-nowrap transition-colors"
              >
                {vt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden border-t bg-white p-4 space-y-1">
          <Link
            href="/products"
            className="block py-2.5 px-3 text-sm font-medium hover:bg-accent rounded-md"
            onClick={() => setMobileMenu(false)}
          >
            All Parts
          </Link>
          <Link
            href="/vehicles"
            className="block py-2.5 px-3 text-sm font-medium hover:bg-accent rounded-md"
            onClick={() => setMobileMenu(false)}
          >
            By Vehicle
          </Link>
          <Link
            href="/wishlist"
            className="block py-2.5 px-3 text-sm font-medium hover:bg-accent rounded-md"
            onClick={() => setMobileMenu(false)}
          >
            Wishlist
          </Link>
          <Link
            href="/cart"
            className="block py-2.5 px-3 text-sm font-medium hover:bg-accent rounded-md"
            onClick={() => setMobileMenu(false)}
          >
            Cart
          </Link>
          {!user && (
            <div className="pt-2 border-t">
              <Link href="/login" onClick={() => setMobileMenu(false)}>
                <Button className="w-full" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
