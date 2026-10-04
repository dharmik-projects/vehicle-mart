"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { thumbUrl } from "@/lib/images";
import { useRouter } from "next/navigation";
import { Plus, CreditCard, Banknote, Smartphone, Check, Loader2, ShieldCheck, MapPin, Package } from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

declare global {
  interface Window { Razorpay: any; }
}

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const loadCart = useCartStore((s) => s.loadCart);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const savingAddressRef = useRef(false);
  const placingRef = useRef(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '',
  });

  const userId = user?.id;

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (items.length === 0 && !processing) { router.push('/cart'); return; }
  }, [user, items, router, processing]);

  /* Addresses are fetched ONCE as soon as the user is known — independent of
     cart items, so an items change (or a cart reload) can never re-trigger it.
     The `alive` guard drops the response if the user changes meanwhile. */
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const data = await api.getAddresses();
        if (!alive) return;
        setAddresses(data.addresses || []);
        if (data.addresses?.length > 0) setSelectedAddress(data.addresses[0]);
      } catch (err) { console.error(err); }
    })();
    return () => { alive = false; };
  }, [userId]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAddressRef.current) return; // ignore double submits
    savingAddressRef.current = true;
    setSavingAddress(true);
    try {
      const data = await api.createAddress(newAddress);
      setAddresses([data.address, ...addresses]);
      setSelectedAddress(data.address);
      setShowNewAddress(false);
      setNewAddress({ label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
      toast.success('Address added!');
    } catch (err: any) { toast.error(err.message); }
    finally {
      savingAddressRef.current = false;
      setSavingAddress(false);
    }
  };

  const loadRazorpayScript = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const handleOnlinePayment = async (order: any) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error('Failed to load payment gateway. Please try again.');
      setProcessing(false);
      return;
    }
    try {
      const payData = await api.createRazorpayOrder(order._id);
      let razorpayMethod: string | string[] | undefined;
      if (paymentMethod === 'upi') razorpayMethod = ['upi'];
      else if (paymentMethod === 'online') razorpayMethod = undefined;

      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: 'VehiclePart',
        description: `Order #${order._id.slice(-8).toUpperCase()}`,
        order_id: payData.razorpayOrderId,
        prefill: { name: user?.name || '', email: user?.email || '', contact: selectedAddress?.phone || '' },
        theme: { color: '#18181b' },
        method: razorpayMethod,
        handler: async (response: any) => {
          try {
            await api.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order._id,
            });
            toast.success('Payment verified successfully!');
            loadCart();
            router.push(`/orders/${order._id}?paid=true`);
          } catch (err: any) {
            toast.error('Payment verification failed: ' + err.message);
            router.push(`/orders/${order._id}?payment_failed=true`);
          }
        },
        modal: { ondismiss: async () => { toast.error('Payment cancelled'); router.push(`/orders/${order._id}?payment_cancelled=true`); } },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (response: any) => {
        toast.error('Payment failed: ' + (response.error?.description || 'Unknown error'));
        router.push(`/orders/${order._id}?payment_failed=true`);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Payment initialization failed');
      router.push(`/orders/${order._id}?payment_failed=true`);
    }
  };

  const handlePlaceOrder = async () => {
    if (placingRef.current || isProcessing) return; // no double submits
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    placingRef.current = true;
    setLoading(true);
    setProcessing(true);
    try {
      const data = await api.createOrder({ addressId: selectedAddress._id, paymentMethod, notes });
      const order = data.order;
      if (paymentMethod === 'cod') {
        toast.success('Order placed successfully!');
        loadCart();
        router.push(`/orders/${order._id}`);
      } else {
        await handleOnlinePayment(order);
      }
    } catch (err: any) {
      toast.error(err.message);
      setProcessing(false);
    } finally {
      setLoading(false);
      placingRef.current = false;
    }
  };

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;
  const isProcessing = loading || processing;

  const labelClass = "text-[13px] font-medium normal-case tracking-normal text-foreground";
  const cardClass = "bg-card rounded-lg border border-border overflow-hidden";
  const primaryBtnClass = "bg-primary text-primary-foreground shadow-soft hover:shadow-card";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className="font-semibold text-foreground">Cart</span>
        <span className="text-muted-foreground/70">→</span>
        <span className="font-semibold text-foreground">Checkout</span>
        <span className="text-muted-foreground/70">→</span>
        <span className="text-muted-foreground">Confirmation</span>
      </div>

      <h1 className="text-xl sm:text-2xl font-display font-semibold text-foreground mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Delivery Address */}
          <div className={cardClass}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Delivery Address</h2>
              </div>
              <button onClick={() => setShowNewAddress(true)} className="text-[13px] font-medium text-primary hover:underline shrink-0">+ Add New</button>
            </div>
            <div className="p-4 space-y-2">
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No addresses saved. Add one to continue.</p>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr._id}
                    onClick={() => !isProcessing && setSelectedAddress(addr)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAddress?._id === addr._id ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'
                    } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{addr.label}</span>
                          {selectedAddress?._id === addr._id && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-sm font-medium mt-1 text-foreground">{addr.fullName} • {addr.phone}</p>
                        <p className="text-xs text-muted-foreground">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                        <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className={cardClass}>
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Payment Method</h2>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {[
                { value: 'cod', label: 'Cash on Delivery', icon: <Banknote className="h-5 w-5" />, desc: 'Pay when your order arrives', color: 'text-foreground' },
                { value: 'online', label: 'Credit / Debit Card', icon: <CreditCard className="h-5 w-5" />, desc: 'Visa, Mastercard, RuPay via Razorpay', color: 'text-foreground' },
                { value: 'upi', label: 'UPI Payment', icon: <Smartphone className="h-5 w-5" />, desc: 'Google Pay, PhonePe, Paytm via Razorpay', color: 'text-foreground' },
              ].map((method) => (
                <div
                  key={method.value}
                  onClick={() => !isProcessing && setPaymentMethod(method.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                    paymentMethod === method.value ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'
                  } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <span className={method.color + ' shrink-0'}>{method.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.desc}</p>
                  </div>
                  {paymentMethod === method.value && (
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
              {paymentMethod !== 'cod' && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
                  <span>Secured by Razorpay. We never store your card details.</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Notes */}
          <div className={cardClass}>
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Order Notes (Optional)</h2>
            </div>
            <div className="p-4">
              <Textarea
                placeholder="Any special instructions for delivery..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-card rounded-lg border border-border p-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Order Summary</h3>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;
                return (
                  <div key={item._id} className="flex gap-3 items-center">
                    <div className="w-11 h-11 bg-muted rounded-lg overflow-hidden shrink-0">
                      {product.images?.[0]?.url ? (
                        <img src={thumbUrl(product.images[0].url, 160)} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-semibold text-foreground shrink-0">{formatPrice(product.price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>

            <Separator />
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className={shipping === 0 ? 'text-success font-medium' : 'font-medium text-foreground'}>
                  {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (GST 18%)</span>
                <span className="font-medium text-foreground">{formatPrice(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg text-foreground">
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <Button className={`w-full mt-4 ${primaryBtnClass}`} size="lg" onClick={handlePlaceOrder} disabled={isProcessing || !selectedAddress}>
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : paymentMethod === 'cod' ? (
                'Place Order'
              ) : (
                `Pay ${formatPrice(grandTotal)}`
              )}
            </Button>

            {shipping > 0 && (
              <p className="text-xs text-center text-success mt-2">
                Add {formatPrice(500 - total)} more for free shipping!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* New Address Dialog */}
      <Dialog open={showNewAddress} onOpenChange={setShowNewAddress}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAddress} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>Label</Label>
                <select value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-card text-foreground px-3 text-sm mt-1.5">
                  <option>Home</option><option>Work</option><option>Other</option>
                </select>
              </div>
              <div>
                <Label className={labelClass}>Full Name</Label>
                <Input required value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} className="mt-1.5 h-9" />
              </div>
            </div>
            <div>
              <Label className={labelClass}>Phone</Label>
              <Input required value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className="mt-1.5 h-9" />
            </div>
            <div>
              <Label className={labelClass}>Address Line 1</Label>
              <Input required value={newAddress.addressLine1} onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })} className="mt-1.5 h-9" />
            </div>
            <div>
              <Label className={labelClass}>Address Line 2</Label>
              <Input value={newAddress.addressLine2} onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })} className="mt-1.5 h-9" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className={labelClass}>City</Label>
                <Input required value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="mt-1.5 h-9" />
              </div>
              <div>
                <Label className={labelClass}>State</Label>
                <Input required value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="mt-1.5 h-9" />
              </div>
              <div>
                <Label className={labelClass}>Pincode</Label>
                <Input required value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} className="mt-1.5 h-9" />
              </div>
            </div>
            <Button type="submit" className={`w-full ${primaryBtnClass}`} disabled={savingAddress}>
              {savingAddress ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                'Save Address'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
