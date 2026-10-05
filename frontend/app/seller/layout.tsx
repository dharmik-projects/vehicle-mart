"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  RotateCcw,
  Star,
  Users,
  Tag,
  CreditCard,
  BarChart3,
  Store,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

const navItems = [
  { href: "/seller", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seller/products", label: "Products", icon: Package },
  { href: "/seller/orders", label: "Orders", icon: ShoppingCart },
  { href: "/seller/returns", label: "Returns", icon: RotateCcw },
  { href: "/seller/reviews", label: "Reviews", icon: Star },
  { href: "/seller/customers", label: "Customers", icon: Users },
  { href: "/seller/coupons", label: "Coupons", icon: Tag },
  { href: "/seller/payouts", label: "Payouts", icon: CreditCard },
  { href: "/seller/reports", label: "Reports", icon: BarChart3 },
  { href: "/seller/store", label: "Store", icon: Store },
  { href: "/seller/notifications", label: "Notifications", icon: Bell },
  { href: "/seller/settings", label: "Settings", icon: Settings },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Defense in depth (AppShell gates too): sellers only, redirect everyone else.
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "admin") { router.replace("/admin"); return; }
    if (user.role === "user") router.replace("/");
  }, [user, authLoading, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!user || user.role !== "seller") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Access denied. Seller only.</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/seller") return pathname === "/seller";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar sits BELOW the sticky global header (h-16 / 4rem): on phones it's
          an off-canvas drawer, from lg a sticky column that keeps its own header
          row (collapse button) visible while scrolling. */}
      <aside className={`fixed lg:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 max-w-[80%] lg:max-w-none bg-card border-r border-border transition-all duration-300 flex flex-col ${
        collapsed ? "lg:w-16" : "lg:w-56"
      } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-xs font-bold">VP</div>
              <span className="font-semibold text-sm text-foreground">Seller</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar" className="hidden lg:flex p-2.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="lg:hidden flex h-11 w-11 -mr-2 items-center justify-center hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <button onClick={() => { logout(); router.push("/"); }} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full" title={collapsed ? "Logout" : undefined} aria-label="Logout">
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-16 z-30 bg-card border-b border-border px-4 py-2 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="flex h-11 w-11 -ml-2 shrink-0 items-center justify-center hover:bg-muted rounded-md text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-primary text-primary-foreground rounded flex items-center justify-center text-xs font-bold shrink-0">VP</div>
            <span className="font-semibold text-sm text-foreground truncate">Seller Panel</span>
          </div>
        </div>
        <div className="p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </div>
  );
}
