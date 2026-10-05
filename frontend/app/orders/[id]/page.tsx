"use client";
import { useState, useEffect, useCallback } from "react";
import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ChevronRight, Package, Truck, Check, Clock, X as XIcon, Loader2, CreditCard, AlertCircle, MapPin } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
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

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
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
    if (authLoading) return; // wait for auth resolution — never bounce to /login mid-flight
    if (!user) { router.push('/login'); return; }
    loadOrder();
  }, [user, authLoading, router, loadOrder]);

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
        theme: { color: '#18181b' },
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

  if (loading) return <div className="vp-container py-6 sm:py-8 fade-in"><Skeleton className="h-96 rounded-lg" /></div>;
  if (!order) return null;

  const currentStepIndex = orderSteps.findIndex((s) => s.key === order.orderStatus);
  const showPaymentRetry = order.paymentStatus === 'pending' && order.paymentMethod !== 'cod';
  const showPaymentFailed = order.paymentStatus === 'failed';

  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">Home</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href="/orders" className="hover:text-primary">Orders</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate text-foreground">#{order._id.slice(-8).toUpperCase()}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariant(order.orderStatus)} className="vp-badge shrink-0 text-sm px-3 py-1">{order.orderStatus}</Badge>
      </div>

      {/* Payment Retry Banner */}
      {(showPaymentRetry || showPaymentFailed) && (
        <div className="mb-5 p-4 rounded-lg border border-warning/40 bg-warning/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {showPaymentFailed ? 'Payment failed' : 'Payment pending'} — Complete payment to confirm your order
              </p>
              <p className="text-xs text-muted-foreground">Amount: {formatPrice(order.total)}</p>
            </div>
          </div>
          <Button onClick={handleRetryPayment} disabled={retrying} size="sm" className="min-h-11 shrink-0 bg-primary text-primary-foreground shadow-soft hover:shadow-card">
            {retrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            {retrying ? 'Processing...' : 'Pay Now'}
          </Button>
        </div>
      )}

      {/* Order Progress */}
      {!['cancelled', 'returned'].includes(order.orderStatus) && (
        <div className="vp-card mb-5 p-5">
          {/* Vertical timeline — phones */}
          <div className="md:hidden">
            {orderSteps.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center self-stretch">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {i < orderSteps.length - 1 && (
                      <div className={`w-0.5 min-h-6 flex-1 ${i < currentStepIndex ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className={`min-w-0 pb-4 ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <p className={`text-sm ${isCurrent ? 'font-semibold' : 'font-medium'}`}>{step.label}</p>
                    {isCompleted && !isCurrent && <p className="text-xs">Completed</p>}
                    {isCurrent && <p className="text-xs text-muted-foreground">Current status</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Horizontal timeline — tablet and up */}
          <div className="hidden md:flex">
            {orderSteps.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-1 flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`mt-1.5 text-center text-xs text-muted-foreground ${isCurrent ? 'font-semibold text-foreground' : ''}`}>{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(5, ((currentStepIndex + 1) / orderSteps.length) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Items */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h3 className="text-base font-bold text-foreground mb-3">Order Items</h3>
          <div className="space-y-3">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                  {item.image ? (
                    <img src={thumbUrl(item.image, 160)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">📦</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="text-sm font-semibold text-foreground shrink-0">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className={order.shippingCost === 0 ? 'text-success font-medium' : 'text-foreground'}>{order.shippingCost === 0 ? 'FREE' : formatPrice(order.shippingCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="text-foreground">{formatPrice(order.tax)}</span></div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg text-foreground"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-base font-bold text-foreground">Shipping Address</h3>
            </div>
            <p className="break-words text-sm font-medium text-foreground">{order.shippingAddress.fullName}</p>
            <p className="break-words text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
            <p className="break-words text-sm text-muted-foreground">{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 && <p className="break-words text-sm text-muted-foreground">{order.shippingAddress.addressLine2}</p>}
            <p className="break-words text-sm text-muted-foreground">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-base font-bold text-foreground">Payment</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium text-foreground text-right capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'upi' ? 'UPI' : 'Online Payment'}</span>
              </div>
              <div className="flex justify-between items-center gap-3 text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant(order.paymentStatus)} className="vp-badge text-xs">{order.paymentStatus}</Badge>
              </div>
              {order.razorpayPaymentId && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono text-xs text-muted-foreground break-all text-right">{order.razorpayPaymentId}</span>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Tracking</span>
                  <span className="font-mono text-xs text-foreground break-all text-right">{order.trackingNumber}</span>
                </div>
              )}
              {order.estimatedDelivery && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Est. Delivery</span>
                  <span className="text-foreground">{formatDate(order.estimatedDelivery)}</span>
                </div>
              )}
            </div>
          </div>

          {['pending', 'confirmed'].includes(order.orderStatus) && (
            <Button variant="outline" className="min-h-11 w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/40" onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
