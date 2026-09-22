"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChevronRight, Package, Truck, Check, Clock, X as XIcon, Loader2, CreditCard, AlertCircle, MapPin } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

declare global { interface Window { Razorpay: any; } }

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
    } catch (err) { console.error(err); toast.error('Order not found'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadOrder();
  }, [user, router, loadOrder]);

  useEffect(() => {
    if (searchParams.get('paid') === 'true') toast.success('Payment confirmed! Your order has been placed.');
    if (searchParams.get('payment_failed') === 'true') toast.error('Payment failed. You can retry below.');
    if (searchParams.get('payment_cancelled') === 'true') toast.error('Payment was cancelled. You can retry below.');
  }, [searchParams]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try { await api.cancelOrder(id); toast.success('Order cancelled'); loadOrder(); }
    catch (err: any) { toast.error(err.message); }
  };

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) { resolve(true); return; }
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
      if (!scriptLoaded) { toast.error('Failed to load payment gateway.'); setRetrying(false); return; }
      const payData = await api.createRazorpayOrder(order._id);
      const options = {
        key: payData.keyId, amount: payData.amount, currency: payData.currency,
        name: 'VehiclePart', description: `Order #${order._id.slice(-8).toUpperCase()}`,
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
          } catch (err: any) { toast.error('Verification failed: ' + err.message); loadOrder(); }
        },
        modal: { ondismiss: () => { toast.error('Payment cancelled'); setRetrying(false); } },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { toast.error('Payment failed. Please try again.'); setRetrying(false); loadOrder(); });
      rzp.open();
    } catch (err: any) { toast.error(err.message || 'Failed to initialize payment'); setRetrying(false); }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8"><Skeleton className="h-96 rounded-xl" /></div>;
  if (!order) return null;

  const currentStepIndex = orderSteps.findIndex((s) => s.key === order.orderStatus);
  const showPaymentRetry = order.paymentStatus === 'pending' && order.paymentMethod !== 'cod';
  const showPaymentFailed = order.paymentStatus === 'failed';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
        <Link href="/" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/orders" className="hover:text-primary">Orders</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">#{order._id.slice(-8).toUpperCase()}</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-gray-500">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <Badge className={getStatusColor(order.orderStatus)}>{order.orderStatus}</Badge>
      </div>

      {/* Payment Retry Banner */}
      {(showPaymentRetry || showPaymentFailed) && (
        <div className="mb-5 p-4 rounded-xl border border-orange-200 bg-orange-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                {showPaymentFailed ? 'Payment failed' : 'Payment pending'} — Complete payment to confirm your order
              </p>
              <p className="text-xs text-orange-600">Amount: {formatPrice(order.total)}</p>
            </div>
          </div>
          <Button onClick={handleRetryPayment} disabled={retrying} size="sm" className="rounded-lg shrink-0">
            {retrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            {retrying ? 'Processing...' : 'Pay Now'}
          </Button>
        </div>
      )}

      {/* Order Progress */}
      {!['cancelled', 'returned'].includes(order.orderStatus) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex items-center">
            {orderSteps.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] sm:text-xs mt-1.5 text-center text-gray-500 hidden sm:block">{step.label}</span>
                  {i < orderSteps.length - 1 && (
                    <div className={`absolute h-0.5 w-full ${i < currentStepIndex ? 'bg-primary' : 'bg-gray-200'}`} style={{ display: 'none' }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(5, ((currentStepIndex + 1) / orderSteps.length) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Items</h3>
          <div className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 shrink-0">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.tax)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-gray-900">Shipping Address</h3>
            </div>
            <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-sm text-gray-500">{order.shippingAddress.phone}</p>
            <p className="text-sm text-gray-500">{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && <p className="text-sm text-gray-500">{order.shippingAddress.addressLine2}</p>}
            <p className="text-sm text-gray-500">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <span className="font-medium capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'upi' ? 'UPI' : 'Online Payment'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge className={getStatusColor(order.paymentStatus) + ' text-[10px]'}>{order.paymentStatus}</Badge>
              </div>
              {order.razorpayPaymentId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transaction ID</span>
                  <span className="font-mono text-xs text-gray-600">{order.razorpayPaymentId}</span>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tracking</span>
                  <span className="font-mono text-xs">{order.trackingNumber}</span>
                </div>
              )}
              {order.estimatedDelivery && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Est. Delivery</span>
                  <span>{formatDate(order.estimatedDelivery)}</span>
                </div>
              )}
            </div>
          </div>

          {['pending', 'confirmed'].includes(order.orderStatus) && (
            <Button variant="destructive" className="w-full rounded-lg" onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
