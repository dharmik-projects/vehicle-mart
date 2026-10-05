"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Package,
  Settings,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cached } from "@/lib/cache";
import { thumbUrl } from "@/lib/images";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ---------- Brand mark ---------- */
function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-8 w-8 text-[13px]" : "h-9 w-9 text-sm";
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-lg bg-primary font-display font-bold tracking-tight text-primary-foreground`}
    >
      VP
    </span>
  );
}

/* ---------- Shared dropdown shell ---------- */
function MenuPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-lg border border-border bg-popover py-1.5 shadow-lift scale-in">
      {children}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClick,
  danger,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const cls = `flex w-full items-center gap-3 px-4 py-2.5 text-[15px] font-medium transition-colors ${
    danger
      ? "text-destructive hover:bg-destructive/10"
      : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
  }`;
  const inner = (
    <>
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </>
  );
  return href ? (
    <Link href={href} className={cls} onClick={onClick}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  );
}

/* ---------- Search box (shared desktop/mobile logic) ---------- */
function useSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const reqIdRef = useRef(0); // stale-response guard: only the latest query wins

  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setSearchError(false);
      setShowSuggestions(false);
      return;
    }
    const reqId = ++reqIdRef.current;
    try {
      setSearchLoading(true);
      setSearchError(false);
      // 60s cache — retyping the same query resolves instantly
      const data = await cached(`suggest:${q.toLowerCase()}`, () =>
        api.getProducts({ q, limit: "6" }),
        { ttl: 60_000 }
      );
      if (reqId !== reqIdRef.current) return; // superseded by a newer keystroke
      setSuggestions(data.products || []);
      setShowSuggestions(true);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setSuggestions([]);
      setSearchError(true);
      setShowSuggestions(true);
    }
    if (reqId === reqIdRef.current) setSearchLoading(false);
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

  const closeSearch = () => {
    setSearchQuery("");
    setShowSuggestions(false);
  };

  return {
    searchQuery,
    suggestions,
    showSuggestions,
    searchLoading,
    searchError,
    handleSearchChange,
    handleSearch,
    handleSuggestionClick,
    closeSearch,
    setShowSuggestions,
  };
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const totalItems = useCartStore((s) => s.totalItems);
  const loadCart = useCartStore((s) => s.loadCart);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const search = useSearch();
  const {
    searchQuery,
    suggestions,
    showSuggestions,
    searchLoading,
    searchError,
    handleSearchChange,
    handleSearch,
    handleSuggestionClick,
    setShowSuggestions,
  } = search;

  const isAdmin = user?.role === "admin";
  const isSeller = user?.role === "seller";

  useEffect(() => {
    if (authLoading) return; // wait until the role is known
    if (user && user.role !== "user") return; // cart is customer-only
    loadCart();
  }, [loadCart, user, authLoading]);

  // Close menus on route change
  useEffect(() => {
    setMobileMenu(false);
    setUserMenu(false);
    setShowSuggestions(false);
  }, [pathname, setShowSuggestions]);

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
  }, [setShowSuggestions]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenu(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const doLogout = () => {
    logout();
    setUserMenu(false);
    setMobileMenu(false);
    router.push("/");
  };

  /* ==================== ADMIN HEADER ==================== */
  if (isAdmin) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-[0_1px_3px_rgba(17,20,26,0.06)]">
        <div className="vp-container flex h-16 items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2.5 py-1">
            <Logo size="sm" />
            <span className="hidden font-display text-base font-semibold tracking-tight sm:block">
              VehiclePart
            </span>
            <span className="vp-badge vp-badge-soft hidden sm:inline-flex items-center gap-1">
              <Shield className="h-3 w-3" /> Admin
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </Button>
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
                <span className="hidden text-foreground sm:block">
                  {user?.name?.split(" ")[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                  <MenuPanel>
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold text-popover-foreground">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <MenuItem
                      href="/admin/settings"
                      icon={<Settings className="h-4 w-4" />}
                      label="Admin Profile"
                      onClick={() => setUserMenu(false)}
                    />
                    <div className="my-1.5 h-px bg-border" />
                    <MenuItem
                      icon={<LogOut className="h-4 w-4" />}
                      label="Logout"
                      onClick={doLogout}
                      danger
                    />
                  </MenuPanel>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  /* ==================== SELLER HEADER ==================== */
  if (isSeller) {
    const sellerLinks = [
      { href: "/seller", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/seller/products", label: "Products", icon: <Package className="h-4 w-4" /> },
      { href: "/seller/orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
      { href: "/seller/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4" /> },
    ];

    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-[0_1px_3px_rgba(17,20,26,0.06)]">
        <div className="vp-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Link href="/seller" className="flex items-center gap-2.5 py-1">
              <Logo size="sm" />
              <span className="hidden font-display text-base font-semibold tracking-tight sm:block">
                VehiclePart
              </span>
            </Link>
            <span className="vp-badge vp-badge-soft hidden sm:inline-flex">Seller</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {sellerLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {l.label}
                {pathname === l.href && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-foreground" />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenu(!userMenu)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
                <span className="hidden text-foreground sm:block">
                  {user?.name?.split(" ")[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {userMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                  <MenuPanel>
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold text-popover-foreground">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <MenuItem
                      href="/seller/settings"
                      icon={<Settings className="h-4 w-4" />}
                      label="Store Settings"
                      onClick={() => setUserMenu(false)}
                    />
                    <div className="my-1.5 h-px bg-border" />
                    <MenuItem
                      icon={<LogOut className="h-4 w-4" />}
                      label="Logout"
                      onClick={doLogout}
                      danger
                    />
                  </MenuPanel>
                </>
              )}
            </div>

            <button
              type="button"
              className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle menu"
            >
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <div className="border-t border-border bg-card md:hidden slide-up">
            <div className="vp-container space-y-1 py-3">
              {sellerLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                    pathname === l.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {l.icon}
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={doLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  /* ==================== CUSTOMER HEADER ====================
     Desktop: Logo | Search | Nav | Wishlist | Cart | Account
     Mobile:  Logo | Search | Cart | Menu                        */
  const navLinks = [
    { href: "/products", label: "All Parts" },
    { href: "/categories", label: "Categories" },
    { href: "/vehicles", label: "By Vehicle" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-[0_1px_3px_rgba(17,20,26,0.06)]">
      <div className="vp-container">
        {/* Mobile: two rows (logo+actions / full-width search). sm+: single row.
            Grid placement only applies below sm — the sm:flex row ignores it. */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 py-1.5 sm:flex sm:h-16 sm:gap-4 sm:py-0">
          {/* Logo */}
          <Link
            href="/"
            className="col-start-1 row-start-1 flex shrink-0 items-center gap-2 py-1"
          >
            <Logo size="sm" />
            <span className="font-display text-[15px] font-bold leading-none tracking-tight text-foreground">
              VehiclePart
            </span>
          </Link>

          {/* Search */}
          <div
            ref={searchRef}
            className="relative col-start-1 col-span-3 row-start-2 min-w-0 sm:col-span-auto sm:row-start-auto sm:flex-1"
          >
            <form onSubmit={handleSearch} role="search">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search spare parts"
                  placeholder="Search parts, brands, OEM numbers..."
                  className="h-11 rounded-lg border-border bg-muted/50 pl-9 pr-20 text-[15px] focus:bg-card focus:border-foreground/30"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0 || searchError) setShowSuggestions(true);
                  }}
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-1.5 h-9 rounded-md px-3 text-sm"
                >
                  Search
                </Button>
                {searchLoading && (
                  <span className="absolute right-[76px] h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                )}
              </div>
            </form>

            {/* Suggestions: results / empty / error */}
            {showSuggestions && (searchLoading || suggestions.length > 0 || searchError || searchQuery.trim().length >= 2) && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-lift scale-in">
                {suggestions.length > 0 ? (
                  <>
                    {suggestions.map((p: any) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => handleSuggestionClick(p.slug)}
                        className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent sm:py-2.5"
                      >
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {p.images?.[0]?.url ? (
                            <img
                              src={thumbUrl(p.images[0].url, 96)}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-popover-foreground">
                            {p.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {formatPrice(p.price)}
                            </span>
                            {p.averageRating > 0 && (
                              <span className="text-sm text-muted-foreground">
                                ★ {p.averageRating}
                              </span>
                            )}
                          </span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                    <Link
                      href={`/products?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center justify-center gap-2 bg-muted/60 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <Search className="h-3.5 w-3.5" />
                      View all results
                    </Link>
                  </>
                ) : searchLoading ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
                ) : searchError ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Search is unavailable right now. Press Enter to retry.
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No products match “{searchQuery.trim()}”
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="relative rounded-lg px-3 py-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform hover:after:scale-x-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="col-start-3 row-start-1 flex shrink-0 items-center gap-0.5 justify-self-end">
            <Link
              href="/wishlist"
              className="relative hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
            </Link>

            <Link
              href="/cart"
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-[18px] text-primary-foreground">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-muted sm:py-1.5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground sm:h-9 sm:w-9">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-foreground lg:block">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                    <MenuPanel>
                      <div className="border-b border-border px-4 py-3">
                        <p className="text-sm font-semibold text-popover-foreground">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <MenuItem
                        href="/orders"
                        icon={<ShoppingCart className="h-4 w-4" />}
                        label="My Orders"
                        onClick={() => setUserMenu(false)}
                      />
                      <MenuItem
                        href="/wishlist"
                        icon={<Heart className="h-4 w-4" />}
                        label="Wishlist"
                        onClick={() => setUserMenu(false)}
                      />
                      <MenuItem
                        href="/profile"
                        icon={<User className="h-4 w-4" />}
                        label="Profile"
                        onClick={() => setUserMenu(false)}
                      />
                      <div className="my-1.5 h-px bg-border" />
                      <MenuItem
                        href="/become-seller"
                        icon={<Store className="h-4 w-4" />}
                        label="Become a Seller"
                        onClick={() => setUserMenu(false)}
                      />
                      <div className="my-1.5 h-px bg-border" />
                      <MenuItem
                        icon={<LogOut className="h-4 w-4" />}
                        label="Logout"
                        onClick={doLogout}
                        danger
                      />
                    </MenuPanel>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button size="sm" className="h-9 px-3.5">
                  <User className="mr-1.5 h-4 w-4" /> Sign in
                </Button>
              </Link>
            )}

            <button
              type="button"
              className="rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Toggle menu"
            >
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="border-t border-border bg-card lg:hidden slide-up">
          <div className="vp-container max-h-[70vh] space-y-1 overflow-y-auto py-3">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/wishlist"
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Wishlist
            </Link>
            <Link
              href="/cart"
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cart{totalItems > 0 ? ` (${totalItems})` : ""}
            </Link>
            <Link
              href="/orders"
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              My Orders
            </Link>
            <Link
              href="/profile"
              className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              My Profile
            </Link>

            {!user && (
              <div className="pt-3">
                <Link href="/login" onClick={() => setMobileMenu(false)}>
                  <Button className="w-full" size="lg">
                    Sign in / Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
