"use client";
import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Package, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { thumbUrl } from "@/lib/images";
import { useAuthStore, useCartStore } from "@/lib/store";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { memo, useState } from "react";

interface ProductCardProps {
  product: any;
  className?: string;
}

const VEHICLE_LABELS: Record<string, string> = {
  car: "Car",
  "2-wheeler": "2-Wheeler",
  truck: "Truck",
  tractor: "Tractor",
  ev: "EV",
  "three-wheeler": "3-Wheeler",
  bus: "Bus",
  universal: "Universal",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 ${i <= Math.round(rating) ? "fill-foreground" : "fill-foreground/25"}`}
          aria-hidden
        >
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 0 0 .95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 0 0-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 0 0-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 0 0-.36-1.12L3.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 0 0 .95-.69l1.07-3.29Z" />
        </svg>
      ))}
    </span>
  );
}

function ProductCard({ product, className = "" }: ProductCardProps) {
  // Selector subscriptions — a cart change must NOT re-render every card.
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishChecked, setWishChecked] = useState(false);
  const [wishing, setWishing] = useState(false);

  const discount =
    product.mrp > product.price
      ? Math.round((1 - product.price / product.mrp) * 100)
      : 0;

  const outOfStock = (product.stock ?? 0) <= 0;
  const lowStock = !outOfStock && product.stock <= 5;
  const image = product.images?.find((i: any) => i.url && !i.isVideo) || product.images?.[0];
  const vehicleTypes: string[] = product.vehicleTypes || [];

  /* Lazy wishlist hydrate — only when the card is actually interacted with */
  const ensureWishlistState = async () => {
    if (wishChecked || !user) return;
    setWishChecked(true);
    try {
      const res = await api.checkWishlist(product._id);
      setWishlisted(!!(res?.inWishlist ?? res?.exists ?? res?.wishlisted));
    } catch {
      /* ignore — non-blocking */
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }
    setAdding(true);
    try {
      await addItem(product._id, 1, product);
      toast.success("Added to cart");
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
    }
    setAdding(false);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to use wishlist");
      return;
    }
    await ensureWishlistState();
    if (wishing) return;
    setWishing(true);
    const prev = wishlisted;
    setWishlisted(!prev); // optimistic
    try {
      const res: any = await api.toggleWishlist(product._id);
      const next =
        typeof res?.wishlisted === "boolean"
          ? res.wishlisted
          : typeof res?.inWishlist === "boolean"
          ? res.inWishlist
          : !prev;
      setWishlisted(next);
      toast.success(next ? "Added to wishlist" : "Removed from wishlist");
    } catch (err: any) {
      setWishlisted(prev); // revert
      toast.error(err.message || "Wishlist update failed");
    }
    setWishing(false);
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group vp-card vp-card-hover relative flex h-full flex-col overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      onMouseEnter={ensureWishlistState}
      onFocus={ensureWishlistState}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted/60">
        {image && !imgError ? (
          <Image
            src={thumbUrl(image.url, 500)}
            alt={product.images?.[0]?.alt || product.name}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            loading="lazy"
            onError={() => setImgError(true)}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
            <Package className="h-10 w-10" />
          </div>
        )}

        {/* Discount */}
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-primary-foreground">
            {discount}% OFF
          </span>
        )}

        {/* Out of stock */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="vp-badge vp-badge-danger">Out of Stock</span>
          </div>
        )}

        {/* Wishlist — always visible on touch, hover-reveal on desktop */}
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={handleWishlist}
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
            wishlisted
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card/95 text-muted-foreground opacity-100 hover:border-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
          }`}
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>

        {/* Quick add — pinned & visible on mobile (no hover), slides up on desktop */}
        <div className="pointer-events-auto absolute inset-x-0 bottom-0 translate-y-0 p-2 transition-transform duration-200 sm:pointer-events-none sm:translate-y-full sm:group-hover:pointer-events-auto sm:group-hover:translate-y-0">
          <button
            type="button"
            disabled={outOfStock || adding}
            onClick={handleAddToCart}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" />
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Add to Cart
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {product.brand}
        </span>

        <h3 className="line-clamp-2 min-h-[2.625rem] text-sm font-semibold leading-snug text-foreground group-hover:underline">
          {product.name}
        </h3>

        {product.averageRating > 0 ? (
          <span className="flex items-center gap-1">
            <span className="flex items-center gap-0.5 rounded bg-muted/80 px-1.5 py-0.5">
              <span className="text-xs font-bold text-foreground">{product.averageRating.toFixed(1)}</span>
              <Stars rating={product.averageRating} />
            </span>
            <span className="text-xs text-muted-foreground">
              ({product.totalReviews || 0})
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No ratings yet</span>
        )}

        {/* Price */}
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
          <span className="text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.mrp > product.price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.mrp)}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[11px] font-semibold text-success">{discount}% off</span>
          )}
        </div>

        {/* Stock */}
        {outOfStock ? (
          <span className="text-xs font-medium text-destructive">Out of stock</span>
        ) : lowStock ? (
          <span className="text-xs font-medium text-warning">Only {product.stock} left</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-success">
            <Check className="h-3.5 w-3.5" /> In stock
          </span>
        )}

        {/* Vehicle compatibility */}
        {vehicleTypes.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-2">
            {vehicleTypes.slice(0, 3).map((vt) => (
              <span
                key={vt}
                className="rounded border border-border/70 bg-muted/50 px-1.5 py-0 text-[10px] font-medium text-muted-foreground"
              >
                {VEHICLE_LABELS[vt] || vt}
              </span>
            ))}
            {vehicleTypes.length > 3 && (
              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{vehicleTypes.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/* Memoized: appending a feed page must not re-render the existing cards. */
export default memo(ProductCard);
