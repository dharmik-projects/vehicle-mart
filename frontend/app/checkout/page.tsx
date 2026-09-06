"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, CreditCard, Banknote, Smartphone, Check } from "lucide-react";
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

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, total } = useCartStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home', fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', state: '', pincode: '',
  });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (items.length === 0) { router.push('/cart'); return; }
    loadAddresses();
  }, [user, items, router]);

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

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return; }
    setLoading(true);
    try {
      const data = await api.createOrder({
        addressId: selectedAddress._id,
        paymentMethod,
        notes,
      });
      toast.success('Order placed successfully!');
      router.push(`/orders/${data.order._id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;

  return (
    <div className="container mx-auto px-4 py-6">
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
                    onClick={() => setSelectedAddress(addr)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAddress?._id === addr._id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
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
                { value: 'online', label: 'Online Payment', icon: <CreditCard className="h-5 w-5" />, desc: 'Credit/Debit Card, Net Banking' },
                { value: 'upi', label: 'UPI', icon: <Smartphone className="h-5 w-5" />, desc: 'Google Pay, PhonePe, Paytm' },
              ].map((method) => (
                <div
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === method.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method.icon}
                  <div>
                    <p className="text-sm font-medium">{method.label}</p>
                    <p className="text-xs text-muted-foreground">{method.desc}</p>
                  </div>
                  {paymentMethod === method.value && <Check className="h-5 w-5 text-primary ml-auto" />}
                </div>
              ))}
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
                  <div key={item._id} className="flex justify-between text-sm">
                    <span className="truncate mr-2">{product.name} × {item.quantity}</span>
                    <span className="shrink-0 font-medium">{formatPrice(product.price * item.quantity)}</span>
                  </div>
                );
              })}
              <Separator />
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
              <div className="flex justify-between text-sm"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
              <div className="flex justify-between text-sm"><span>Tax (GST)</span><span>{formatPrice(tax)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(grandTotal)}</span></div>
              <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={loading || !selectedAddress}>
                {loading ? 'Placing Order...' : 'Place Order'}
              </Button>
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
