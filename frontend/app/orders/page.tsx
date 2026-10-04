"use client";
import { useState, useEffect } from "react";
import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ListRowsSkeleton } from "@/components/ui/page-skeleton";

const statusVariant = (status: string) => {
  switch (status) {
    case 'delivered': case 'paid': case 'active':
      return 'success';
    case 'pending': case 'refunded':
      return 'warning';
    case 'cancelled': case 'failed': case 'returned':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (authLoading) return; // wait for auth resolution — never bounce to /login mid-flight
    if (!user) { router.push('/login'); return; }
    loadOrders();
  }, [user, authLoading, router, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: '1', limit: '50' };
      if (statusFilter) params.status = statusFilter;
      const data = await api.getOrders(params);
      setOrders(data.orders || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (authLoading) return <ListRowsSkeleton count={6} />;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground mb-4">My Orders</h1>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-5 overflow-x-auto no-scrollbar pb-1">
        <TabsList className="h-9">
          <TabsTrigger value="" className="text-[13px]">All</TabsTrigger>
          <TabsTrigger value="pending" className="text-[13px]">Pending</TabsTrigger>
          <TabsTrigger value="confirmed" className="text-[13px]">Confirmed</TabsTrigger>
          <TabsTrigger value="shipped" className="text-[13px]">Shipped</TabsTrigger>
          <TabsTrigger value="delivered" className="text-[13px]">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-[13px]">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}`} className="block">
              <div className="bg-card rounded-lg border border-border p-4 hover:shadow-soft transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{formatDate(order.createdAt)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{order.items.length} item(s) • {order.paymentMethod === 'cod' ? 'COD' : 'Online'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={statusVariant(order.orderStatus)} className="vp-badge text-xs">{order.orderStatus}</Badge>
                    <p className="text-sm font-semibold text-foreground mt-1">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {order.items.slice(0, 4).map((item: any, i: number) => (
                    <div key={i} className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={thumbUrl(item.image, 160)} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">📦</div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground shrink-0 font-medium">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="vp-empty text-center py-16 bg-muted rounded-lg border border-border">
          <ShoppingBag className="h-12 w-12 text-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">No orders yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Start shopping to place your first order</p>
          <Link href="/products"><Button className="bg-primary text-primary-foreground shadow-soft hover:shadow-card">Browse Parts</Button></Link>
        </div>
      )}
    </div>
  );
}
