"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Package, Truck, Check, Clock, X as XIcon } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

const orderSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Check },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadOrder();
  }, [user, router]);

  const loadOrder = async () => {
    try {
      const data = await api.getOrder(id);
      setOrder(data.order);
    } catch (err) {
      console.error(err);
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.cancelOrder(id);
      toast.success('Order cancelled');
      loadOrder();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-8"><Skeleton className="h-96 rounded-lg" /></div>;
  if (!order) return null;

  const currentStepIndex = orderSteps.findIndex((s) => s.key === order.orderStatus);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/orders" className="hover:text-primary">Orders</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">#{order._id.slice(-8).toUpperCase()}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <Badge className={getStatusColor(order.orderStatus)}>{order.orderStatus}</Badge>
      </div>

      {/* Order Progress */}
      {!['cancelled', 'returned'].includes(order.orderStatus) && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {orderSteps.map((step, i) => {
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-primary text-primary-foreground' : 'bg-gray-200 text-gray-500'
                    } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs mt-2 text-center">{step.label}</span>
                    {i < orderSteps.length - 1 && (
                      <div className={`h-0.5 flex-1 mt-2 ${i < currentStepIndex ? 'bg-primary' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="w-14 h-14 bg-gray-50 rounded overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="text-sm font-bold shrink-0">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatPrice(order.tax)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Shipping Address</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
              <p className="text-sm">{order.shippingAddress.phone}</p>
              <p className="text-sm text-muted-foreground">{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p className="text-sm text-muted-foreground">{order.shippingAddress.addressLine2}</p>}
              <p className="text-sm text-muted-foreground">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Method</span>
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <Badge className={getStatusColor(order.paymentStatus)}>{order.paymentStatus}</Badge>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between text-sm">
                  <span>Tracking</span>
                  <span className="font-mono">{order.trackingNumber}</span>
                </div>
              )}
              {order.estimatedDelivery && (
                <div className="flex justify-between text-sm">
                  <span>Est. Delivery</span>
                  <span>{formatDate(order.estimatedDelivery)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {['pending', 'confirmed'].includes(order.orderStatus) && (
            <Button variant="destructive" className="w-full" onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
