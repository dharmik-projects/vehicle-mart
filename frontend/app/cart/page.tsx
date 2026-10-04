"use client";
import { useEffect, useState } from "react";
import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, PackageOpen, Package, Loader2 } from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

export default function CartPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  // Auth is still resolving on first paint — never flash the "Sign in" prompt for it.
  const authLoading = useAuthStore((s) => s.isLoading);
  // Individual selectors — only the pieces this page renders subscribe to.
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const totalItems = useCartStore((s) => s.totalItems);
  const loadCart = useCartStore((s) => s.loadCart);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearAll = useCartStore((s) => s.clearAll);
  const [loading, setLoading] = useState(true);
  /* Per-item in-flight guard (keyed by product id): while an item's quantity
     update or removal is running, that item's controls are disabled so rapid
     clicks can't race each other — other rows stay interactive. */
  const [busyItems, setBusyItems] = useState<Record<string, boolean>>({});

  const runItemAction = async (productId: string, action: () => Promise<void>) => {
    if (busyItems[productId]) return;
    setBusyItems((m) => ({ ...m, [productId]: true }));
    try {
      await action();
    } finally {
      setBusyItems((m) => {
        const next = { ...m };
        delete next[productId];
        return next;
      });
    }
  };

  const handleQty = (productId: string, quantity: number) =>
    runItemAction(productId, () => updateItem(productId, quantity));

  const handleRemove = (productId: string) =>
    runItemAction(productId, () => removeItem(productId));

  useEffect(() => {
    if (user) {
      loadCart().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, loadCart]);

  if (loading || authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
        <Skeleton className="h-7 w-48 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="rounded-lg"><CardContent className="p-4 flex gap-4">
                <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent></Card>
            ))}
          </div>
          <div><Card className="rounded-lg"><CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent></Card></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 fade-in">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted border border-border">
          <ShoppingBag className="h-7 w-7 text-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground mb-4">Sign in to view your cart</p>
        <Link href="/login"><Button className="bg-primary text-primary-foreground shadow-soft hover:shadow-card">Sign In</Button></Link>
      </div>
    );
  }

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 fade-in">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted border border-border">
          <PackageOpen className="h-7 w-7 text-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground mb-4">Start shopping to add parts to your cart</p>
        <Link href="/products"><Button className="bg-primary text-primary-foreground shadow-soft hover:shadow-card">Browse Parts</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-5">Shopping Cart ({totalItems} items)</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;
            return (
              <div key={item._id} className="bg-card rounded-lg border border-border p-4 hover:shadow-soft transition-shadow">
                <div className="flex gap-4">
                  <Link href={`/products/${product.slug}`} className="shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-lg overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <img src={thumbUrl(product.images[0].url, 160)} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="h-6 w-6" /></div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${product.slug}`} className="text-[15px] font-medium hover:underline line-clamp-2 text-foreground">
                      {product.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
                    <p className="text-base font-bold mt-1.5 text-foreground">{formatPrice(product.price)}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-sm font-semibold text-foreground">{formatPrice(product.price * item.quantity)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-border">
                  <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
                    <button
                      onClick={() => handleQty(product._id, Math.max(1, item.quantity - 1))}
                      className="h-10 w-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                      aria-label="Decrease quantity"
                      disabled={!!busyItems[product._id]}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-3 h-10 min-w-[2.5rem] flex items-center justify-center text-sm font-medium border-x border-border">{item.quantity}</span>
                    <button
                      onClick={() => handleQty(product._id, Math.min(product.stock, item.quantity + 1))}
                      className="h-10 w-10 flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                      aria-label="Increase quantity"
                      disabled={!!busyItems[product._id]}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-foreground sm:hidden">{formatPrice(product.price * item.quantity)}</span>
                  <button
                    onClick={() => handleRemove(product._id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-3 rounded-lg transition-colors sm:p-2 disabled:opacity-50"
                    title="Remove"
                    aria-label="Remove item"
                    disabled={!!busyItems[product._id]}
                  >
                    {busyItems[product._id] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={() => clearAll()} className="text-destructive hover:text-destructive hover:bg-destructive/10">Clear Cart</Button>
            <Link href="/products"><Button variant="ghost" size="sm" className="hover:bg-muted hover:text-foreground">Continue Shopping</Button></Link>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-card rounded-lg border border-border p-5 lg:sticky lg:top-20">
            <h3 className="text-[15px] font-bold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
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
              <div className="flex justify-between font-bold text-xl text-foreground">
                <span>Total</span>
                <span>{formatPrice(grandTotal)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-success bg-success/10 rounded-lg p-2 text-center">
                  Add {formatPrice(500 - total)} more for free shipping!
                </p>
              )}
              <Button className="w-full mt-2 bg-primary text-primary-foreground shadow-soft hover:shadow-card h-12" size="lg" onClick={() => router.push('/checkout')}>
                Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
