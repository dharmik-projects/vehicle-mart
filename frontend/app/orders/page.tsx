"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadOrders();
  }, [user, router, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: '1', limit: '50' };
      if (statusFilter) params.status = statusFilter;
      const data = await api.getOrders(params);
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl fade-in">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="mb-6">
          <TabsTrigger value="">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Order #{order._id.slice(-8).toUpperCase()}</p>
                      <p className="text-sm font-medium mt-1">{formatDate(order.createdAt)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{order.items.length} item(s)</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.orderStatus)}>{order.orderStatus}</Badge>
                      <p className="text-sm font-bold mt-2">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {order.items.slice(0, 4).map((item: any, i: number) => (
                      <div key={i} className="w-12 h-12 bg-gray-50 rounded overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">📦</div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center text-xs text-muted-foreground shrink-0">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 hidden md:block" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-4">Start shopping to place your first order</p>
          <Link href="/products"><Button>Browse Parts</Button></Link>
        </div>
      )}
    </div>
  );
}
