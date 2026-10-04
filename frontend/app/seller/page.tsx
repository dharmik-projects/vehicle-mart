"use client";
import { useState, useEffect } from "react";
import { thumbUrl } from "@/lib/images";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle,
  Clock, Truck, CheckCircle, XCircle, ArrowRight, Star,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusVariant = (status?: string) => {
  switch (status) {
    case "delivered":
    case "paid":
    case "active":
    case "approved":
      return "success" as const;
    case "pending":
    case "returned":
    case "refunded":
      return "warning" as const;
    case "cancelled":
    case "failed":
    case "rejected":
      return "destructive" as const;
    case "confirmed":
    case "processing":
    case "shipped":
    case "inactive":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

export default function SellerOverview() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) {
      router.push("/login");
      return;
    }
    loadDashboard();
  }, [user, router]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerDashboard();
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  const statCards: Array<{ label: string; value: React.ReactNode; icon: any; wide?: boolean }> = [
    { label: "Total Revenue", value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign },
    { label: "Active Products", value: stats?.activeProducts || 0, icon: Package },
    { label: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingCart },
    { label: "Items Sold", value: stats?.totalSold || 0, icon: TrendingUp },
    // These two span two columns on lg so the 4-col grid still ends on a full row.
    { label: "Paid Orders", value: stats?.paidOrders || 0, icon: CheckCircle, wide: true },
    { label: "Pending Revenue", value: formatPrice(stats?.pendingRevenue || 0), icon: Clock, wide: true },
  ];

  const orderStatusCards = [
    { label: "Pending", value: stats?.pendingOrders || 0, icon: Clock },
    { label: "Processing", value: stats?.processingOrders || 0, icon: Package },
    { label: "Shipped", value: stats?.shippedOrders || 0, icon: Truck },
    { label: "Delivered", value: stats?.deliveredOrders || 0, icon: CheckCircle },
    { label: "Cancelled", value: stats?.cancelledOrders || 0, icon: XCircle },
    { label: "Returned", value: stats?.returnedOrders || 0, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        <Link href="/seller/products" className="w-fit">
          <Button className="rounded-lg"><Package className="h-4 w-4 mr-2" /> Manage Products</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`vp-stat${i > 4 ? " lg:col-span-2" : ""}`}>
              <div className="animate-pulse space-y-2"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-8 bg-muted rounded w-1/3" /></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <div key={i} className={`vp-stat${s.wide ? " lg:col-span-2" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2.5"><s.icon className="h-5 w-5 text-foreground" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-base sm:text-xl font-bold text-foreground">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Orders by Status */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Orders by Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {orderStatusCards.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-border">
                    <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                      <p className="text-base sm:text-lg font-bold text-foreground">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Low Stock Alert</h3>
              {stats?.lowStockProducts > 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-warning/30 bg-warning/10">
                  <AlertTriangle className="h-8 w-8 text-warning shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">{stats.lowStockProducts} products low on stock</p>
                    <Link href="/seller/products?status=low-stock" className="text-xs text-foreground hover:underline">
                      View all low stock items
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">All products are well-stocked.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Selling Products */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Top Selling Products</h3>
                <Link href="/seller/products" className="text-xs text-foreground hover:underline flex items-center gap-1 font-medium">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topProducts.map((p: any, i: number) => (
                    <div key={p._id || i} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden shrink-0">
                        {p.images?.[0]?.url ? (
                          <img src={thumbUrl(p.images[0].url, 96)} alt="" loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(p.price)} • {p.totalSales} sold</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-foreground shrink-0">
                        <Star className="h-3 w-3 fill-current" />
                        {p.averageRating || 0}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No sales data yet.</p>
                </div>
              )}
            </div>

            {/* Recent Orders */}
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Orders</h3>
                <Link href="/seller/orders" className="text-xs text-foreground hover:underline flex items-center gap-1 font-medium">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                <div className="space-y-2.5">
                  {stats.recentOrders.slice(0, 5).map((order: any) => (
                    <div key={order._id} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.user?.name || "User"} • {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <Badge variant={statusVariant(order.orderStatus)} className="text-xs">{order.orderStatus}</Badge>
                        <p className="text-xs font-semibold text-foreground mt-1">{formatPrice(order.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Sales */}
          {stats?.monthlySales && stats.monthlySales.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Monthly Sales</h3>
              <div className="flex items-end gap-2 h-40">
                {stats.monthlySales.map((m: any, i: number) => {
                  const maxRevenue = Math.max(...stats.monthlySales.map((s: any) => s.revenue));
                  const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">{formatPrice(m.revenue)}</span>
                      <div
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {monthNames[(m._id?.month || 1) - 1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
