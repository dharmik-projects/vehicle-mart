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
      <div className="vp-container py-6 sm:py-8 fade-in">
        <Skeleton className="mb-6 h-7 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
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
      <div className="vp-container fade-in flex min-h-[60vh] flex-col items-center justify-center py-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted">
          <ShoppingBag className="h-7 w-7 text-foreground" />
        </div>
        <h1 className="mb-1 text-xl font-semibold text-foreground">Your cart is empty</h1>
        <p className="mb-4 text-sm text-muted-foreground">Sign in to view your cart</p>
        <Link href="/login"><Button className="bg-primary text-primary-foreground shadow-soft hover:shadow-card">Sign In</Button></Link>
      </div>
    );
  }

  const shipping = total >= 500 ? 0 : 49;
  const tax = Math.round(total * 0.18);
  const grandTotal = total + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="vp-container fade-in flex min-h-[60vh] flex-col items-center justify-center py-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted">
          <PackageOpen className="h-7 w-7 text-foreground" />
        </div>
        <h1 className="mb-1 text-xl font-semibold text-foreground">Your cart is empty</h1>
        <p className="mb-4 text-sm text-muted-foreground">Start shopping to add parts to your cart</p>
        <Link href="/products"><Button className="bg-primary text-primary-foreground shadow-soft hover:shadow-card">Browse Parts</Button></Link>
      </div>
    );
  }

  return (
    <div className="vp-container py-6 pb-28 sm:py-8 sm:pb-28 lg:pb-0 fade-in">
      <h1 className="mb-5 text-xl font-display font-bold text-foreground sm:text-2xl">Shopping Cart ({totalItems} items)</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const product = item.product;
            if (!product) return null;
            return (
              <div key={item._id} className="bg-card rounded-lg border border-border p-4 transition-shadow hover:shadow-soft">
                <div className="flex gap-3 sm:gap-4">
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
                    <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[36px] break-words text-[15px] font-medium text-foreground hover:underline">
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
                      className="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent sm:h-10 sm:w-10"
                      aria-label="Decrease quantity"
                      disabled={!!busyItems[product._id]}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="flex h-11 min-w-[2.5rem] items-center justify-center border-x border-border px-3 text-sm font-medium sm:h-10">{item.quantity}</span>
                    <button
                      onClick={() => handleQty(product._id, Math.min(product.stock, item.quantity + 1))}
                      className="flex h-11 w-11 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent sm:h-10 sm:w-10"
                      aria-label="Increase quantity"
                      disabled={!!busyItems[product._id]}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-foreground sm:hidden">{formatPrice(product.price * item.quantity)}</span>
                  <button
                    onClick={() => handleRemove(product._id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-3 rounded-lg transition-colors sm:p-2.5 disabled:opacity-50"
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
          <div className="flex flex-wrap justify-between gap-2 pt-2">
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
              <Button className="mt-2 h-12 w-full bg-primary text-primary-foreground shadow-soft hover:shadow-card" size="lg" onClick={() => router.push('/checkout')}>
                Proceed to Checkout <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky checkout bar — keeps the running total reachable while scrolling */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Total ({totalItems} items)</p>
            <p className="text-lg font-bold leading-tight text-foreground">{formatPrice(grandTotal)}</p>
          </div>
          <Button size="lg" className="min-h-12 shrink-0 px-6 bg-primary text-primary-foreground shadow-soft hover:shadow-card" onClick={() => router.push('/checkout')}>
            Checkout <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
