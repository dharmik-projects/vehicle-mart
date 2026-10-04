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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground mb-5">My Wishlist</h1>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3">
              <Skeleton className="w-full aspect-square rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => {
            const p = item.product;
            if (!p) return null;
            return (
              <div key={item._id} className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3 hover:shadow-soft transition-shadow">
                <Link href={`/products/${p.slug}`} className="shrink-0">
                  <div className="w-full aspect-square bg-muted rounded-lg overflow-hidden">
                    {p.images?.[0]?.url ? (
                      <img src={thumbUrl(p.images[0].url, 300)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="h-8 w-8" /></div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <Link href={`/products/${p.slug}`} className="text-sm font-medium hover:text-primary line-clamp-2 text-foreground">{p.name}</Link>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.brand}</p>
                  <p className="text-sm font-semibold mt-1 text-foreground">{formatPrice(p.price)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-auto pt-3">
                    <Button size="sm" onClick={() => handleAddToCart(p)} className="bg-primary text-primary-foreground shadow-soft hover:shadow-card flex-1">
                      <ShoppingCart className="h-3 w-3 mr-1" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(p._id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2.5">
                      <Trash2 className="h-3.5 w-3.5" />
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
