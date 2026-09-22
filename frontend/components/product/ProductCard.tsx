"use client";
import Link from "next/link";
import { Star, Heart, ShoppingCart, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useAuthStore, useCartStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { useState } from "react";

interface ProductCardProps {
  product: any;
  className?: string;
}

export default function ProductCard({ product, className = "" }: ProductCardProps) {
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);

  const discount = product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }
    setAdding(true);
    try {
      await addItem(product._id);
      toast.success("Added to cart!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className={`group block ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {product.images?.[0]?.url && !imgError ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
              {discount}% OFF
            </span>
          )}

          {/* Out of stock overlay */}
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-white text-gray-900 text-xs font-semibold px-3 py-1 rounded">Out of Stock</span>
            </div>
          )}

          {/* Add to cart button - appears on hover */}
          {product.stock > 0 && (
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-700 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-primary hover:text-white hover:border-primary shadow-sm"
              title="Add to cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col">
          {product.brand && (
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              {product.brand}
            </p>
          )}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mt-0.5 group-hover:text-primary transition-colors leading-snug flex-1">
            {product.name}
          </h3>

          {/* Rating */}
          {product.averageRating > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded">
                <span className="text-xs font-semibold text-green-700">{product.averageRating}</span>
                <Star className="h-3 w-3 fill-green-600 text-green-600" />
              </div>
              <span className="text-[11px] text-muted-foreground">
                ({product.totalReviews || 0})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.mrp > product.price && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
            )}
          </div>

          {/* Stock indicator */}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-[11px] text-orange-600 font-medium mt-1">
              Only {product.stock} left
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
