"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, PackageOpen } from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-4">Sign in to view your cart</p>
        <Link href="/login"><Button>Sign In</Button></Link>
      </div>
    );
  }

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 fade-in">
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="p-4 flex gap-4">
                <Skeleton className="w-20 h-20 rounded shrink-0" />
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
        <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground mb-4">Start shopping to add parts to your cart</p>
        <Link href="/products"><Button>Browse Parts</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 fade-in">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart ({totalItems} items)</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;
            return (
              <Card key={item._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex gap-4">
                  <Link href={`/products/${product.slug}`} className="shrink-0">
                    <div className="w-20 h-20 bg-gray-50 rounded overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><span>📦</span></div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${product.slug}`} className="text-sm font-medium hover:text-primary line-clamp-2">
                      {product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
                    <p className="text-sm font-bold mt-1">{formatPrice(product.price)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border rounded-md">
                        <button onClick={() => updateItem(product._id, Math.max(1, item.quantity - 1))} className="p-1 hover:bg-accent transition-colors"><Minus className="h-3 w-3" /></button>
                        <span className="px-3 py-1 text-sm font-medium">{item.quantity}</span>
                        <button onClick={() => updateItem(product._id, Math.min(product.stock, item.quantity + 1))} className="p-1 hover:bg-accent transition-colors"><Plus className="h-3 w-3" /></button>
                      </div>
                      <button onClick={() => removeItem(product._id)} className="text-red-500 hover:text-red-700 p-1 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{formatPrice(product.price * item.quantity)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => clearAll()}>Clear Cart</Button>
            <Link href="/products"><Button variant="ghost">Continue Shopping</Button></Link>
          </div>
        </div>

        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({totalItems} items)</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>
                  {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (GST 18%)</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-green-600">Add {formatPrice(500 - total)} more for free shipping!</p>
              )}
              <Button className="w-full" size="lg" onClick={() => router.push('/checkout')}>
                Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
