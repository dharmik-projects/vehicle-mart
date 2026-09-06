"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle,
  Store, Star, ArrowUpRight, ArrowDownRight, Boxes, Tag,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOverview() {
  const { user } = useAuthStore();
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Revenue", value: formatPrice(stats.totalRevenue || 0), icon: DollarSign, color: "bg-green-500", change: null },
    { label: "Total Orders", value: stats.totalOrders || 0, icon: ShoppingCart, color: "bg-blue-500", sub: `${stats.pendingOrders || 0} pending` },
    { label: "Total Users", value: stats.totalUsers || 0, icon: Users, color: "bg-purple-500", sub: `${stats.totalSellers || 0} sellers` },
    { label: "Total Products", value: stats.totalProducts || 0, icon: Package, color: "bg-orange-500", sub: `${stats.pendingProducts || 0} pending approval` },
    { label: "Active Products", value: stats.activeProducts || 0, icon: Boxes, color: "bg-teal-500", sub: `${stats.inactiveProducts || 0} inactive` },
    { label: "Delivered Orders", value: stats.deliveredOrders || 0, icon: TrendingUp, color: "bg-emerald-500", sub: `${stats.cancelledOrders || 0} cancelled` },
    { label: "Low Stock Items", value: stats.lowStockProducts || 0, icon: AlertTriangle, color: "bg-yellow-500", sub: "Stock ≤ 5" },
    { label: "Pending Sellers", value: stats.pendingSellers || 0, icon: Store, color: "bg-indigo-500", sub: "Awaiting approval" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}/10`}>
                  <s.icon className={`h-5 w-5 ${s.color.replace("bg-", "text-")}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                  {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Monthly Revenue</h3>
            {stats.monthlyRevenue?.length > 0 ? (
              <div className="space-y-2">
                {stats.monthlyRevenue.map((m: any) => {
                  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return (
                    <div key={`${m._id.year}-${m._id.month}`} className="flex items-center justify-between text-sm">
                      <span>{monthNames[m._id.month]} {m._id.year}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{m.orders} orders</span>
                        <span className="font-medium">{formatPrice(m.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Orders by Status</h3>
            {stats.ordersByStatus?.length > 0 ? (
              <div className="space-y-2">
                {stats.ordersByStatus.map((s: any) => (
                  <div key={s._id} className="flex items-center justify-between text-sm">
                    <Badge className={getStatusColor(s._id)}>{s._id}</Badge>
                    <span className="font-medium">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Top Selling Products</h3>
            {stats.topSellingProducts?.length > 0 ? (
              <div className="space-y-2">
                {stats.topSellingProducts.map((p: any) => (
                  <div key={p._id} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden shrink-0">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.totalSales} sold</p>
                    </div>
                    <span className="font-medium">{formatPrice(p.price)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Recent Orders</h3>
              <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {stats.recentOrders?.length > 0 ? (
              <div className="space-y-2">
                {stats.recentOrders.slice(0, 5).map((o: any) => (
                  <div key={o._id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-mono text-xs">#{o._id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{o.user?.name || "User"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(o.total)}</p>
                      <Badge className={`${getStatusColor(o.orderStatus)} text-[10px]`}>{o.orderStatus}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
