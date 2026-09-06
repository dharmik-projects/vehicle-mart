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
import { Button } from "@/components/ui/button";

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
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "seller" && user.role !== "admin") {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user || (user.role !== "seller" && user.role !== "admin")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Access denied. Seller only.</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/seller") return pathname === "/seller";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)]">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-[4.5rem] z-40 h-[calc(100vh-4.5rem)] bg-white border-r transition-all duration-300 flex flex-col ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between p-3 border-b">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Seller Panel</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1 hover:bg-accent rounded"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-accent rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            title={collapsed ? "Back to Store" : undefined}
          >
            <Store className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Back to Store</span>}
          </Link>
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-2 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-1 hover:bg-accent rounded">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Seller Panel</span>
          </div>
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </div>
    </div>
  );
}
