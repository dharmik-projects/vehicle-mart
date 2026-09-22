"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, PackageOpen, Package } from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, total, totalItems, loadCart, updateItem, removeItem, clearAll } = useCartStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCart().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, loadCart]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 fade-in">
        <ShoppingBag className="h-14 w-14 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-1">Your cart is empty</h2>
        <p className="text-sm text-gray-500 mb-4">Sign in to view your cart</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
        <Skeleton className="h-7 w-48 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-4 flex gap-4">
                <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent></Card>
            ))}
          </div>
          <div><Card><CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent></Card></div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 fade-in">
        <PackageOpen className="h-14 w-14 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-1">Your cart is empty</h2>
        <p className="text-sm text-gray-500 mb-4">Start shopping to add parts to your cart</p>
        <Link href="/products"><Button>Browse Parts</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Shopping Cart ({totalItems} items)</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;
            return (
              <div key={item._id} className="bg-white rounded-lg border border-gray-200 p-4 flex gap-4 hover:shadow-sm transition-shadow">
                <Link href={`/products/${product.slug}`} className="shrink-0">
                  <div className="w-20 h-20 bg-gray-50 rounded-lg overflow-hidden">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="h-6 w-6" /></div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${product.slug}`} className="text-sm font-medium hover:text-primary line-clamp-2 text-gray-900">
                    {product.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{product.brand}</p>
                  <p className="text-sm font-bold mt-1 text-gray-900">{formatPrice(product.price)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateItem(product._id, Math.max(1, item.quantity - 1))}
                        className="p-1.5 hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-3 py-1 text-sm font-medium border-x border-gray-200">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(product._id, Math.min(product.stock, item.quantity + 1))}
                        className="p-1.5 hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => removeItem(product._id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors" title="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatPrice(product.price * item.quantity)}</p>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={() => clearAll()} className="text-gray-500 hover:text-red-600">Clear Cart</Button>
            <Link href="/products"><Button variant="ghost" size="sm">Continue Shopping</Button></Link>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-24">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal ({totalItems} items)</span>
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
              {shipping > 0 && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg p-2 text-center">
                  Add {formatPrice(500 - total)} more for free shipping!
                </p>
              )}
              <Button className="w-full mt-2" size="lg" onClick={() => router.push('/checkout')}>
                Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
