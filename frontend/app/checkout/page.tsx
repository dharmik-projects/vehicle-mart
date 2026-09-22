"use client";
import { useState, useEffect, useCallback } from "react";
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
      if (data.addresses?.length > 0) setSelectedAddress(data.addresses[0]);
    } catch (err) { console.error(err); }
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
    } catch (err: any) { toast.error(err.message); }
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
        theme: { color: '#2563eb' },
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
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
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
    } finally { setLoading(false); }
  };

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;
  const isProcessing = loading || processing;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className="font-semibold text-primary">Cart</span>
        <span className="text-gray-300">→</span>
        <span className="font-semibold text-primary">Checkout</span>
        <span className="text-gray-300">→</span>
        <span className="text-gray-400">Confirmation</span>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Delivery Address */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-gray-900">Delivery Address</h2>
              </div>
              <button onClick={() => setShowNewAddress(true)} className="text-xs font-medium text-primary hover:underline">+ Add New</button>
            </div>
            <div className="p-4 space-y-2">
              {addresses.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">No addresses saved. Add one to continue.</p>
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
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{addr.label}</span>
                          {selectedAddress?._id === addr._id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-sm font-medium mt-1">{addr.fullName} • {addr.phone}</p>
                        <p className="text-xs text-gray-500">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                        <p className="text-xs text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-gray-900">Payment Method</h2>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {[
                { value: 'cod', label: 'Cash on Delivery', icon: <Banknote className="h-5 w-5" />, desc: 'Pay when your order arrives', color: 'text-green-600' },
                { value: 'online', label: 'Credit / Debit Card', icon: <CreditCard className="h-5 w-5" />, desc: 'Visa, Mastercard, RuPay via Razorpay', color: 'text-blue-600' },
                { value: 'upi', label: 'UPI Payment', icon: <Smartphone className="h-5 w-5" />, desc: 'Google Pay, PhonePe, Paytm via Razorpay', color: 'text-purple-600' },
              ].map((method) => (
                <div
                  key={method.value}
                  onClick={() => !isProcessing && setPaymentMethod(method.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === method.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <span className={method.color}>{method.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.desc}</p>
                  </div>
                  {paymentMethod === method.value && (
                    <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
              {paymentMethod !== 'cod' && (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span>Secured by Razorpay. We never store your card details.</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Notes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Order Notes (Optional)</h2>
            </div>
            <div className="p-4">
              <Textarea
                placeholder="Any special instructions for delivery..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isProcessing}
                className="border-gray-200 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;
                return (
                  <div key={item._id} className="flex gap-3 items-center">
                    <div className="w-11 h-11 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {product.images?.[0]?.url ? (
                        <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 line-clamp-1">{product.name}</p>
                      <p className="text-[11px] text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900 shrink-0">{formatPrice(product.price * item.quantity)}</p>
                  </div>
                );
              })}
            </div>

            <Separator />
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : 'font-medium'}>
                  {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax (GST 18%)</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
            </div>

            <Button className="w-full mt-4" size="lg" onClick={handlePlaceOrder} disabled={isProcessing || !selectedAddress}>
              {isProcessing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : paymentMethod === 'cod' ? (
                'Place Order'
              ) : (
                `Pay ${formatPrice(grandTotal)}`
              )}
            </Button>

            {shipping > 0 && (
              <p className="text-xs text-center text-green-600 mt-2">
                Add {formatPrice(500 - total)} more for free shipping!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* New Address Dialog */}
      <Dialog open={showNewAddress} onOpenChange={setShowNewAddress}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAddress} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Label</Label>
                <select value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm mt-1">
                  <option>Home</option><option>Work</option><option>Other</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input required value={newAddress.fullName} onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })} className="mt-1 h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input required value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Address Line 1</Label>
              <Input required value={newAddress.addressLine1} onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })} className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-xs">Address Line 2</Label>
              <Input value={newAddress.addressLine2} onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })} className="mt-1 h-9" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input required value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Input required value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Pincode</Label>
                <Input required value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} className="mt-1 h-9" />
              </div>
            </div>
            <Button type="submit" className="w-full">Save Address</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
