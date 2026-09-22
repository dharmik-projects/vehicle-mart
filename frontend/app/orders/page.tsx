"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ChevronRight, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">My Orders</h1>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-5">
        <TabsList className="h-9">
          <TabsTrigger value="" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs">Confirmed</TabsTrigger>
          <TabsTrigger value="shipped" className="text-xs">Shipped</TabsTrigger>
          <TabsTrigger value="delivered" className="text-xs">Delivered</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}`} className="block">
              <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all hover:border-primary/20 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Order #{order._id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(order.createdAt)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{order.items.length} item(s) • {order.paymentMethod === 'cod' ? 'COD' : 'Online'}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(order.orderStatus) + ' text-[10px]'}>{order.orderStatus}</Badge>
                    <p className="text-sm font-bold text-gray-900 mt-1">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {order.items.slice(0, 4).map((item: any, i: number) => (
                    <div key={i} className="w-11 h-11 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">📦</div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-11 h-11 bg-gray-50 rounded-lg flex items-center justify-center text-xs text-gray-400 shrink-0 font-medium">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h2>
          <p className="text-sm text-gray-500 mb-4">Start shopping to place your first order</p>
          <Link href="/products"><Button className="rounded-lg">Browse Parts</Button></Link>
        </div>
      )}
    </div>
  );
}
