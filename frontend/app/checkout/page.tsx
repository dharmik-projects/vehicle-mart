"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, CreditCard, Banknote, Smartphone, Check, Loader2, ShieldCheck } from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, total, loadCart } = useCartStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (items.length === 0 && !processing) { router.push('/cart'); return; }
    loadAddresses();
  }, [user, items, router, processing]);

  const loadAddresses = async () => {
    try {
      const data = await api.getAddresses();
      setAddresses(data.addresses || []);
      if (data.addresses?.length > 0) {
        setSelectedAddress(data.addresses[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.createAddress(newAddress);
      setAddresses([data.address, ...addresses]);
      setSelectedAddress(data.address);
      setShowNewAddress(false);
      setNewAddress({ label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
      toast.success('Address added!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadRazorpayScript = useCallback(() => {
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

      // Determine Razorpay method based on payment method selected
      let razorayMethod: string | string[] | undefined;
      if (paymentMethod === 'upi') {
        // Show only UPI options — Razorpay will show UPI QR/Intent
        razorayMethod = ['upi'];
      } else if (paymentMethod === 'online') {
        // Show card/netbanking/wallet options
        razorayMethod = undefined; // default: show all relevant methods
      } else {
        razorayMethod = undefined;
      }

      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: 'VehiclePart',
        description: `Order #${order._id.slice(-8).toUpperCase()}`,
        order_id: payData.razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: selectedAddress?.phone || '',
        },
        theme: { color: '#2563eb' },
        method: razorayMethod,
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
        modal: {
          ondismiss: async () => {
            toast.error('Payment cancelled');
            router.push(`/orders/${order._id}?payment_cancelled=true`);
          },
        },
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
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    setLoading(true);
    setProcessing(true);
    try {
      const data = await api.createOrder({
        addressId: selectedAddress._id,
        paymentMethod,
        notes,
      });
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
    }
  };

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;

  const isProcessing = loading || processing;

  return (
    <div className="container mx-auto px-4 py-6 fade-in">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Delivery Address</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowNewAddress(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add New
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No addresses saved. Add one to continue.</p>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr._id}
                    onClick={() => !isProcessing && setSelectedAddress(addr)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAddress?._id === addr._id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">{addr.label}</span>
                          {selectedAddress?._id === addr._id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-sm font-medium mt-1">{addr.fullName} • {addr.phone}</p>
                        <p className="text-sm text-muted-foreground">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                        <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { value: 'cod', label: 'Cash on Delivery', icon: <Banknote className="h-5 w-5" />, desc: 'Pay when your order arrives' },
                { value: 'online', label: 'Credit / Debit Card', icon: <CreditCard className="h-5 w-5" />, desc: 'Visa, Mastercard, RuPay via Razorpay' },
                { value: 'upi', label: 'UPI Payment', icon: <Smartphone className="h-5 w-5" />, desc: 'Google Pay, PhonePe, Paytm via Razorpay' },
              ].map((method) => (
                <div
                  key={method.value}
                  onClick={() => !isProcessing && setPaymentMethod(method.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === method.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {method.icon}
                  <div>
                    <p className="text-sm font-medium">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.desc}</p>
                  </div>
                  {paymentMethod === method.value && <Check className="h-5 w-5 text-primary ml-auto" />}
                </div>
              ))}
              {paymentMethod !== 'cod' && (
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span>Secured by Razorpay. We never store your card details.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special instructions for delivery..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isProcessing}
              />
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;
                return (
                  <div key={item._id} className="flex gap-3 items-center">
                    <div className="w-12 h-12 bg-gray-50 rounded overflow-hidden shrink-0">
                      {product.images?.[0]?.url ? (
                        <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold shrink-0">{formatPrice(product.price * item.quantity)}</p>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span>{shipping === 0 ? <span className="text-green-600 font-medium">FREE</span> : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-sm"><span>Tax (GST 18%)</span><span>{formatPrice(tax)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(grandTotal)}</span></div>
              <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={isProcessing || !selectedAddress}>
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : paymentMethod === 'cod' ? (
                  'Place Order'
                ) : (
                  `Pay ${formatPrice(grandTotal)}`
                )}
              </Button>
              {shipping > 0 && (
                <p className="text-xs text-center text-green-600">Add {formatPrice(500 - total)} more for free shipping!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Address Dialog */}
      <Dialog open={showNewAddress} onOpenChange={setShowNewAddress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAddress} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Label</Label>
                <select value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} className="w-full h-10 rounded-md border px-3 text-sm">
                  <option>Home</option><option>Work</option><option>Other</option>
                </select>
              </div>
              <div><Label>Full Name</Label><Input required value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} /></div>
            </div>
            <div><Label>Phone</Label><Input required value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} /></div>
            <div><Label>Address Line 1</Label><Input required value={newAddress.addressLine1} onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })} /></div>
            <div><Label>Address Line 2</Label><Input value={newAddress.addressLine2} onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><Input required value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} /></div>
              <div><Label>State</Label><Input required value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} /></div>
              <div><Label>Pincode</Label><Input required value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full">Save Address</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
