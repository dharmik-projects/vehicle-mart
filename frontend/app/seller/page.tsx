"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle,
  Clock, Truck, CheckCircle, XCircle, ArrowRight, Star,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SellerOverview() {
  const router = useRouter();
  const { user } = useAuthStore();
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

  const statCards = [
    { label: "Total Revenue", value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: "Active Products", value: stats?.activeProducts || 0, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Items Sold", value: stats?.totalSold || 0, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const orderStatusCards = [
    { label: "Pending", value: stats?.pendingOrders || 0, icon: Clock, color: "text-yellow-600" },
    { label: "Processing", value: stats?.processingOrders || 0, icon: Package, color: "text-blue-600" },
    { label: "Shipped", value: stats?.shippedOrders || 0, icon: Truck, color: "text-indigo-600" },
    { label: "Delivered", value: stats?.deliveredOrders || 0, icon: CheckCircle, color: "text-green-600" },
    { label: "Cancelled", value: stats?.cancelledOrders || 0, icon: XCircle, color: "text-red-600" },
    { label: "Returned", value: stats?.returnedOrders || 0, icon: AlertTriangle, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {user.name}</p>
        </div>
        <Link href="/seller/products">
          <Button><Package className="h-4 w-4 mr-2" /> Manage Products</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="animate-pulse space-y-2"><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-8 bg-gray-200 rounded w-1/3" /></div></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {orderStatusCards.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-lg font-bold">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Low Stock Alert</CardTitle></CardHeader>
              <CardContent>
                {stats?.lowStockProducts > 0 ? (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="font-semibold text-orange-700">{stats.lowStockProducts} products low on stock</p>
                      <Link href="/seller/products?status=low-stock" className="text-sm text-orange-600 hover:underline">
                        View all low stock items
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">All products are well-stocked.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Top Selling Products</CardTitle>
                <Link href="/seller/products" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.topProducts && stats.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topProducts.map((p: any, i: number) => (
                      <div key={p._id || i} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded overflow-hidden shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📦</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(p.price)} • {p.totalSales} sold</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <Star className="h-3 w-3 fill-current" />
                          {p.averageRating || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No sales data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <Link href="/seller/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View All <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentOrders.slice(0, 5).map((order: any) => (
                      <div key={order._id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">#{order._id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{order.user?.name || "User"} • {formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(order.orderStatus)}>{order.orderStatus}</Badge>
                          <p className="text-xs font-semibold mt-1">{formatPrice(order.total)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No orders yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {stats?.monthlySales && stats.monthlySales.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Sales</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {stats.monthlySales.map((m: any, i: number) => {
                    const maxRevenue = Math.max(...stats.monthlySales.map((s: any) => s.revenue));
                    const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{formatPrice(m.revenue)}</span>
                        <div
                          className="w-full bg-primary rounded-t"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {monthNames[(m._id?.month || 1) - 1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
