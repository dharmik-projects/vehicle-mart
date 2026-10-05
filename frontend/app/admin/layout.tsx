"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  FolderTree,
  Car,
  ShoppingCart,
  Star,
  Tag,
  BarChart3,
  Bell,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Boxes,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const logout = useAuthStore((s) => s.logout);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Defense in depth (AppShell gates too): admins only, redirect everyone else.
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "seller") { router.replace("/seller"); return; }
    if (user.role === "user") router.replace("/");
  }, [user, authLoading, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Below the sticky global header (h-16): off-canvas drawer on phones,
          sticky column from lg with its own header row always visible. */}
      <aside className={`fixed lg:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 max-w-[80%] bg-primary text-primary-foreground transition-all duration-300 flex flex-col ${
        collapsed ? "lg:w-16" : "lg:w-56"
      } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/15 text-white rounded-lg flex items-center justify-center text-xs font-bold">VP</div>
              <span className="font-semibold text-sm text-white">Admin</span>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden lg:flex p-2.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="lg:hidden p-2.5 min-h-11 min-w-11 flex items-center justify-center hover:bg-white/10 rounded-md text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-white/10">
          <button onClick={() => { logout(); router.push("/"); }} className="flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white w-full" title={collapsed ? "Logout" : undefined}>
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-16 z-30 bg-card border-b border-border px-4 py-2 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2.5 min-h-11 min-w-11 flex items-center justify-center hover:bg-muted rounded-md text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-foreground" />
            <span className="font-semibold text-sm text-foreground">Admin Panel</span>
          </div>
        </div>
        <div className="p-4 sm:p-5 lg:p-6">{children}</div>
      </div>
    </div>
  );
}
