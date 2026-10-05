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
          className={`h-3 w-3 ${i <= Math.round(rating) ? "fill-warning" : "fill-foreground/20"}`}
          aria-hidden
        >
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 0 0 .95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 0 0-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 0 0-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 0 0-.36-1.12L3.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 0 0 .95-.69l1.07-3.29Z" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Marketplace product card.
 *
 * Structure (top → bottom):
 *   [ Discount badge ]              [ Wishlist ]
 *   [        Large square image (contain — never cropped)        ]
 *   Brand / category
 *   Product name (2-line clamp, fixed min-height)
 *   Rating
 *   ₹ price   MRP   discount
 *   ✓ stock / compatibility chip
 *   [            Add to cart (pinned to the bottom)            ]
 *
 * Every section is height-stable so cards in a row stay aligned, and the
 * card grows with its grid cell instead of cramming content.
 */
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

  /* Brand, falling back to category name when brand is missing */
  const categoryName =
    typeof product.category === "object" ? product.category?.name || "" : "";
  const brandLine = product.brand || categoryName;

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
      {/* Meta row — badge + wishlist live OUTSIDE the image so nothing ever
          overlaps the product photo */}
      <div className="flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-2 sm:px-3 sm:pb-2 sm:pt-2.5">
        {discount > 0 ? (
          <span className="shrink-0 rounded-md bg-primary px-2 py-1 text-[11px] font-bold leading-none tracking-wide text-primary-foreground">
            {discount}% OFF
          </span>
        ) : (
          <span aria-hidden />
        )}
        <button
          type="button"
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={handleWishlist}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            wishlisted
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
          }`}
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
        </button>
      </div>

      {/* Image — 4:3 uses the wider card without making it a tall rectangle */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
        {image && !imgError ? (
          <Image
            src={thumbUrl(image.url, 500)}
            alt={product.images?.[0]?.alt || product.name}
            fill
            sizes="(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 50vw"
            loading="lazy"
            onError={() => setImgError(true)}
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
            <Package className="h-10 w-10" />
          </div>
        )}

        {/* Out of stock state over the image */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="vp-badge vp-badge-danger">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Body — compact 4px rhythm so the card stays short; ATC pinned at the bottom */}
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <span className="block min-h-4 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {brandLine}
        </span>

        <h3 className="line-clamp-2 min-h-[2.25rem] text-[13px] font-medium leading-snug text-foreground group-hover:underline sm:min-h-[2.5rem] sm:text-sm">
          {product.name}
        </h3>

        {/* Rating — fixed-height row so price/stock never shift between cards */}
        <div className="flex min-h-5 flex-wrap items-center gap-x-1">
          {product.averageRating > 0 ? (
            <>
              <span className="flex items-center gap-0.5 rounded bg-muted/80 px-1.5 py-0.5">
                <span className="text-xs font-bold leading-none text-foreground">
                  {product.averageRating.toFixed(1)}
                </span>
                <Stars rating={product.averageRating} />
              </span>
              <span className="text-xs text-muted-foreground">
                ({product.totalReviews || 0})
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No ratings yet</span>
          )}
        </div>

        {/* Price: selling price + MRP + discount — fits on one line at 360px */}
        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1 sm:gap-x-1.5">
          <span className="text-[16px] font-bold leading-tight text-foreground sm:text-lg">
            {formatPrice(product.price)}
          </span>
          {product.mrp > product.price && (
            <span className="text-[11px] text-muted-foreground line-through sm:text-xs">
              {formatPrice(product.mrp)}
            </span>
          )}
          {discount > 0 && (
            <span className="text-[11px] font-semibold text-success sm:text-xs">
              {discount}% off
            </span>
          )}
        </div>

        {/* Stock + compatibility — one stable row (chip truncates instead of wrapping) */}
        <div className="flex min-h-5 items-center gap-1.5">
          {outOfStock ? (
            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-destructive sm:text-[13px]">
              Out of stock
            </span>
          ) : lowStock ? (
            <span className="shrink-0 whitespace-nowrap text-xs font-medium text-warning sm:text-[13px]">
              Only {product.stock} left
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-success sm:text-[13px]">
              <Check className="h-3.5 w-3.5" /> In stock
            </span>
          )}
          {vehicleTypes.length > 0 && (
            <span className="ml-auto block max-w-[50%] min-w-0 truncate rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-muted-foreground">
              {VEHICLE_LABELS[vehicleTypes[0]] || vehicleTypes[0]}
              {vehicleTypes.length > 1 ? ` +${vehicleTypes.length - 1}` : ""}
            </span>
          )}
        </div>

        {/* Add to cart — full-width, fixed height, vertically centered, pinned */}
        <button
          type="button"
          disabled={outOfStock || adding}
          onClick={handleAddToCart}
          className="mt-auto flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:text-sm"
        >
          {adding ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 shrink-0" /> Add to Cart
            </>
          )}
        </button>
      </div>
    </Link>
  );
}

/* Memoized: appending a feed page must not re-render the existing cards. */
export default memo(ProductCard);
