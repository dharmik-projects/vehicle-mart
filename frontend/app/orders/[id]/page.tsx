"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChevronRight, Package, Truck, Check, Clock, X as XIcon, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const orderSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Check },
];

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const data = await api.getOrder(id);
      setOrder(data.order);
    } catch (err) {
      console.error(err);
      toast.error('Order not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadOrder();
  }, [user, router, loadOrder]);

  useEffect(() => {
    if (searchParams.get('paid') === 'true') {
      toast.success('Payment confirmed! Your order has been placed.');
    }
    if (searchParams.get('payment_failed') === 'true') {
      toast.error('Payment failed. You can retry below.');
    }
    if (searchParams.get('payment_cancelled') === 'true') {
      toast.error('Payment was cancelled. You can retry below.');
    }
  }, [searchParams]);

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

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRetryPayment = async () => {
    setRetrying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway.');
        setRetrying(false);
        return;
      }

      const payData = await api.createRazorpayOrder(order._id);

      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: 'VehiclePart',
        description: `Order #${order._id.slice(-8).toUpperCase()}`,
        order_id: payData.razorpayOrderId,
        prefill: { name: user?.name || '', email: user?.email || '' },
        theme: { color: '#2563eb' },
        handler: async (response: any) => {
          try {
            await api.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order._id,
            });
            toast.success('Payment verified!');
            loadOrder();
            router.replace(`/orders/${order._id}`);
          } catch (err: any) {
            toast.error('Verification failed: ' + err.message);
            loadOrder();
          }
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled');
            setRetrying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setRetrying(false);
        loadOrder();
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize payment');
      setRetrying(false);
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-8"><Skeleton className="h-96 rounded-lg" /></div>;
  if (!order) return null;

  const currentStepIndex = orderSteps.findIndex((s) => s.key === order.orderStatus);
  const showPaymentRetry = order.paymentStatus === 'pending' && order.paymentMethod !== 'cod';
  const showPaymentFailed = order.paymentStatus === 'failed';

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl fade-in">
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

      {/* Payment Retry Banner */}
      {(showPaymentRetry || showPaymentFailed) && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {showPaymentFailed ? 'Payment failed' : 'Payment pending'} — Complete payment to confirm your order
                </p>
                <p className="text-xs text-orange-600">Amount: {formatPrice(order.total)}</p>
              </div>
            </div>
            <Button onClick={handleRetryPayment} disabled={retrying} size="sm">
              {retrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {retrying ? 'Processing...' : 'Retry Payment'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Order Progress */}
      {!['cancelled', 'returned'].includes(order.orderStatus) && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center">
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
                    <span className="text-xs mt-2 text-center hidden sm:block">{step.label}</span>
                    {i < orderSteps.length - 1 && (
                      <div className={`h-0.5 w-full mt-2 ${i < currentStepIndex ? 'bg-primary' : 'bg-gray-200'}`} />
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
                <span className="capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'upi' ? 'UPI' : 'Online Payment'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <Badge className={getStatusColor(order.paymentStatus)}>{order.paymentStatus}</Badge>
              </div>
              {order.razorpayPaymentId && (
                <div className="flex justify-between text-sm">
                  <span>Transaction ID</span>
                  <span className="font-mono text-xs">{order.razorpayPaymentId}</span>
                </div>
              )}
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
