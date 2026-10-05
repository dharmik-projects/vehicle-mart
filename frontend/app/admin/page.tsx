"use client";
import { useState, useEffect } from "react";
import { thumbUrl } from "@/lib/images";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle,
  Store, Star, Boxes, Tag,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { statusColor } from "@/components/charts/statusColors";

const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function statusBadgeVariant(status: string) {
  switch (status) {
    case "active":
    case "delivered":
    case "paid":
    case "confirmed":
      return "success";
    case "pending":
    case "processing":
    case "shipped":
    case "refunded":
      return "warning";
    case "cancelled":
    case "failed":
    case "returned":
      return "destructive";
    case "inactive":
      return "secondary";
    default:
      return "outline";
  }
}

export default function AdminOverview() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      const data = await api.getAdminDashboard();
      setStats(data.stats);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="vp-main space-y-5 sm:space-y-6 fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Revenue", value: formatPrice(stats.totalRevenue || 0), icon: DollarSign, sub: `${formatPrice(stats.pendingRevenue || 0)} pending` },
    { label: "Total Orders", value: stats.totalOrders || 0, icon: ShoppingCart, sub: `${stats.paidOrders || 0} paid · ${stats.pendingPayments || 0} awaiting payment` },
    { label: "Total Users", value: stats.totalUsers || 0, icon: Users, sub: `${stats.totalSellers || 0} sellers` },
    { label: "Total Products", value: stats.totalProducts || 0, icon: Package, sub: `${stats.pendingProducts || 0} pending approval` },
    { label: "Active Products", value: stats.activeProducts || 0, icon: Boxes, sub: `${stats.inactiveProducts || 0} inactive` },
    { label: "Delivered Orders", value: stats.deliveredOrders || 0, icon: TrendingUp, sub: `${stats.cancelledOrders || 0} cancelled · ${stats.refundedOrders || 0} refunded` },
    { label: "Low Stock Items", value: stats.lowStockProducts || 0, icon: AlertTriangle, sub: "Stock ≤ 5" },
    { label: "Pending Sellers", value: stats.pendingSellers || 0, icon: Store, sub: "Awaiting approval" },
  ];

  return (
    <div className="vp-main space-y-5 sm:space-y-6 fade-in">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard Overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-3 sm:p-5 min-w-0">
            <div className="w-9 h-9 bg-muted text-foreground rounded-lg flex items-center justify-center mb-2 sm:mb-3">
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-xs sm:text-[13px] text-muted-foreground line-clamp-2">{s.label}</p>
            <p className="text-lg sm:text-xl font-semibold text-foreground leading-tight break-words tabular-nums">{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-0.5 break-words">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Monthly Revenue */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Monthly Revenue</h3>
          {stats.monthlyRevenue?.length > 0 ? (
            <>
              <TrendChart
                points={stats.monthlyRevenue.map((m: any): TrendPoint => ({
                  label: `${monthNames[m._id?.month || 1]} ${String(m._id?.year || "").slice(2)}`,
                  value: Number(m.revenue) || 0,
                  tip: `${formatPrice(m.revenue)} · ${m.orders} order${m.orders === 1 ? "" : "s"}`,
                }))}
                valueFormat={formatPrice}
                height={170}
              />
              <div className="mt-3 space-y-2.5">
                {stats.monthlyRevenue.map((m: any) => (
                  <div key={`${m._id.year}-${m._id.month}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="text-foreground">{monthNames[m._id.month]} {m._id.year}</span>
                    <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                      <span className="text-muted-foreground">{m.orders} orders</span>
                      <span className="font-medium text-foreground tabular-nums">{formatPrice(m.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data available yet</p>
          )}
        </div>

        {/* Orders by Status */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Orders by Status</h3>
          {stats.ordersByStatus?.length > 0 ? (
            <DonutChart
              segments={stats.ordersByStatus.map((s: any) => ({
                label: s._id,
                value: Number(s.count) || 0,
                color: statusColor(s._id),
              }))}
              centerValue={String(stats.ordersByStatus.reduce((sum: number, s: any) => sum + (Number(s.count) || 0), 0))}
              centerLabel="orders"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No data available yet</p>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top Selling Products</h3>
          {stats.topSellingProducts?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.topSellingProducts.map((p: any) => (
                <div key={p._id} className="flex items-center gap-3 text-sm">
                  <div className="w-9 h-9 bg-muted rounded-lg overflow-hidden shrink-0">
                    {p.images?.[0]?.url ? (
                      <img src={thumbUrl(p.images[0].url, 96)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.totalSales} sold</p>
                  </div>
                  <span className="font-medium text-foreground text-sm shrink-0">{formatPrice(p.price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sales data yet</p>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
            <Link href="/admin/orders" className="inline-flex min-h-9 items-center py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium">View all</Link>
          </div>
          {stats.recentOrders?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentOrders.slice(0, 5).map((o: any) => (
                <div key={o._id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-foreground">#{o._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.user?.name || "User"}</p>
                  </div>
                  <div className="text-right ml-auto shrink-0">
                    <p className="font-medium text-foreground">{formatPrice(o.total)}</p>
                    <Badge variant={statusBadgeVariant(o.orderStatus)} className="text-xs">{o.orderStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
