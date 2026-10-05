"use client";
import { useState, useEffect } from "react";
import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Trash2, ShoppingCart, Package } from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/ui/page-skeleton";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const addItem = useCartStore((s) => s.addItem);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // wait for auth resolution — never bounce to /login mid-flight
    if (!user) { router.push('/login'); return; }
    loadWishlist();
  }, [user, authLoading, router]);

  const loadWishlist = async () => {
    try { const data = await api.getWishlist(); setItems(data.items || []); }
    catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleToggle = async (productId: string) => {
    const prev = items;
    setItems(prev.filter((item) => item.product?._id !== productId)); // instant remove
    try { await api.toggleWishlist(productId); toast.success('Removed from wishlist'); }
    catch (err: any) { setItems(prev); toast.error(err.message); }
  };

  const handleAddToCart = async (product: any) => {
    try { await addItem(product._id, 1, product); toast.success('Added to cart!'); }
    catch (err: any) { toast.error(err.message); }
  };

  if (authLoading) return <ProductGridSkeleton count={8} />;
  if (!user) return null;

  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <h1 className="mb-5 text-xl font-display font-bold text-foreground sm:text-2xl">My Wishlist</h1>
      {loading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4">
              <Skeleton className="aspect-square w-full shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 min-[1700px]:grid-cols-5">
          {items.map((item) => {
            const p = item.product;
            if (!p) return null;
            return (
              <div key={item._id} className="vp-card vp-card-hover flex flex-col gap-3 p-3 sm:p-4">
                <Link href={`/products/${p.slug}`} className="shrink-0">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                    {p.images?.[0]?.url ? (
                      <img src={thumbUrl(p.images[0].url, 300)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Package className="h-8 w-8" /></div>
                    )}
                  </div>
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/products/${p.slug}`} className="line-clamp-2 break-words text-sm font-medium text-foreground hover:text-primary">{p.name}</Link>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.brand}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatPrice(p.price)}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                    <Button size="sm" onClick={() => handleAddToCart(p)} className="min-h-10 flex-1 bg-primary text-primary-foreground shadow-soft hover:shadow-card">
                      <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(p._id)} aria-label="Remove from wishlist" className="flex h-10 w-10 shrink-0 items-center justify-center p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="vp-empty text-center py-16 bg-muted rounded-lg border border-border">
          <Heart className="h-12 w-12 text-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Wishlist is empty</h2>
          <p className="text-sm text-muted-foreground mb-4">Save parts you like for later</p>
          <Link href="/products"><Button className="bg-primary text-primary-foreground shadow-soft hover:shadow-card">Browse Parts</Button></Link>
        </div>
      )}
    </div>
  );
}
