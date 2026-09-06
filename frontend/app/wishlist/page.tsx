"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { useAuthStore, useCartStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

export default function WishlistPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadWishlist();
  }, [user, router]);

  const loadWishlist = async () => {
    try {
      const data = await api.getWishlist();
      setItems(data.items || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleToggle = async (productId: string) => {
    try {
      await api.toggleWishlist(productId);
      setItems(items.filter((item) => item.product?._id !== productId));
      toast.success('Removed from wishlist');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await addItem(productId);
      toast.success('Added to cart!');
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl fade-in">
      <h1 className="text-2xl font-bold mb-6">My Wishlist</h1>
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-4 flex gap-4">
              <Skeleton className="w-20 h-20 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
                <div className="flex gap-2 mt-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-8" /></div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const p = item.product;
            if (!p) return null;
            return (
              <Card key={item._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex gap-4">
                  <Link href={`/products/${p.slug}`} className="shrink-0">
                    <div className="w-20 h-20 bg-gray-50 rounded overflow-hidden">
                      {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${p.slug}`} className="text-sm font-medium hover:text-primary line-clamp-2">{p.name}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.brand}</p>
                    <p className="text-sm font-bold mt-1">{formatPrice(p.price)}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => handleAddToCart(p._id)}><ShoppingCart className="h-3 w-3 mr-1" /> Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggle(p._id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wishlist is empty</h2>
          <p className="text-muted-foreground mb-4">Save parts you like for later</p>
          <Link href="/products"><Button>Browse Parts</Button></Link>
        </div>
      )}
    </div>
  );
}
