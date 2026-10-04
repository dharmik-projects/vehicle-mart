"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star, ShoppingCart, Heart, Truck, Shield, ChevronRight, Minus, Plus,
  Check, Share2, ZoomIn, Package, Store, ThumbsUp, Pencil, Trash2,
  Camera, X, ChevronLeft as ChevronLeftIcon, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { recordProductView } from "@/lib/recent";
import { formatPrice, formatDate } from "@/lib/utils";
import { detailUrl, thumbUrl } from "@/lib/images";
import { useAuthStore, useCartStore } from "@/lib/store";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/product/ProductCard";
import toast from "react-hot-toast";

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 text-right">{star}★</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-foreground/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-muted-foreground text-xs">{count}</span>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [ratingBreakdown, setRatingBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  /* In-flight guards: Add to Cart / Buy Now share cartBusy; the wishlist
     toggle has its own so the two never block each other. */
  const [cartBusy, setCartBusy] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rating: 5, title: "", comment: "" });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getProduct(slug);
        if (cancelled) return;
        setProduct(data.product);
        recordProductView(data.product); // feeds the homepage “Recently Viewed” section

        if (data.product?._id) {
          // Independent follow-ups run in parallel — wishlist status no longer
          // waits for related products + reviews to land first.
          const wishlistCheck = user
            ? api.checkWishlist(data.product._id).catch(() => null) // a failed check is non-fatal
            : Promise.resolve(null);
          const [relData, revData, wlData] = await Promise.all([
            api.getRelatedProducts(data.product._id),
            api.getProductReviews(data.product._id),
            wishlistCheck,
          ]);
          if (cancelled) return;
          setRelated(relData.products || []);
          setReviews(revData.reviews || []);
          setRatingBreakdown(revData.ratingBreakdown || []);
          if (wlData) setWishlisted(!!wlData.wishlisted);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error("Product not found");
          router.push("/products");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug]);

  const handleAddToCart = async () => {
    if (!user) { router.push("/login"); return; }
    if (cartBusy) return; // one in-flight add at a time
    setCartBusy(true);
    try {
      // Single request — the store adds `qty` optimistically in one round-trip.
      await addItem(product._id, qty, product);
      toast.success(`Added ${qty} item${qty > 1 ? "s" : ""} to cart!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCartBusy(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) { router.push("/login"); return; }
    if (cartBusy) return;
    setCartBusy(true);
    try {
      await addItem(product._id, qty, product);
    } catch (err: any) {
      toast.error(err.message);
      setCartBusy(false);
      return;
    }
    router.push("/checkout"); // stays disabled until the route changes
  };

  const handleToggleWishlist = async () => {
    if (!user) { router.push("/login"); return; }
    if (wishBusy) return;
    const prev = wishlisted;
    setWishlisted(!prev); // instant feedback
    setWishBusy(true);
    try {
      const data = await api.toggleWishlist(product._id);
      setWishlisted(data.wishlisted);
      toast.success(data.message);
    } catch (err: any) {
      setWishlisted(prev); // rollback
      toast.error(err.message);
    } finally {
      setWishBusy(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url: window.location.href });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReviewImages((prev) => [...prev, ...files].slice(0, 5));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReviewImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReviewImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setReviewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("productId", product._id);
      formData.append("rating", String(reviewForm.rating));
      formData.append("title", reviewForm.title);
      formData.append("comment", reviewForm.comment);
      reviewImages.forEach((f) => formData.append("images", f));

      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("Review submitted!");
      const revData = await api.getProductReviews(product._id);
      setReviews(revData.reviews || []);
      setRatingBreakdown(revData.ratingBreakdown || []);
      setReviewForm({ rating: 5, title: "", comment: "" });
      setReviewImages([]);
      setReviewImagePreviews([]);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleEditReview = async (reviewId: string) => {
    try {
      await api.fetch(`/reviews/${reviewId}`, { method: "PUT", body: editForm });
      toast.success("Review updated!");
      const revData = await api.getProductReviews(product._id);
      setReviews(revData.reviews || []);
      setRatingBreakdown(revData.ratingBreakdown || []);
      setEditingReview(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await api.fetch(`/reviews/${reviewId}`, { method: "DELETE" });
      toast.success("Review deleted");
      const revData = await api.getProductReviews(product._id);
      setReviews(revData.reviews || []);
      setRatingBreakdown(revData.ratingBreakdown || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    if (!user) { router.push("/login"); return; }
    try {
      await api.markHelpful(reviewId);
      toast.success("Marked as helpful");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1360px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const specs = product.specifications instanceof Map ? Object.fromEntries(product.specifications) : (product.specifications || {});
  const totalReviewCount = ratingBreakdown.reduce((sum: number, r: any) => sum + r.count, 0);

  return (
      <div className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8 fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-5 flex-wrap">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        {product.category && (
          <>
            <Link href={`/products?category=${product.category._id}`} className="hover:text-foreground transition-colors">
              {product.category.name}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </>
        )}
        <span className="text-foreground truncate">{product.name}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        {/* Images */}
        <div>
          <div
            ref={imageContainerRef}
            className="aspect-square bg-muted rounded-lg overflow-hidden mb-3 relative cursor-crosshair border border-border"
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={handleMouseMove}
          >
            {product.images?.[selectedImage]?.url ? (
              <Image
                src={detailUrl(product.images[selectedImage].url, 1200)}
                alt={product.name}
                fill
                priority={selectedImage === 0}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-contain transition-transform duration-200"
                style={isZooming ? {
                  transform: "scale(1.8)",
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                } : {}}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-border">
                <Package className="h-24 w-24" />
              </div>
            )}
            {isZooming && product.images?.[selectedImage]?.url && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <ZoomIn className="h-3 w-3" /> Hover to zoom
              </div>
            )}
            {product.mrp > product.price && (
              <Badge className="absolute left-3 top-3 px-2.5 py-1 text-sm">
                {Math.round((1 - product.price / product.mrp) * 100)}% OFF
              </Badge>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${i === selectedImage ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/40"}`}
                >
                  <img src={thumbUrl(img.url, 128)} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{product.name}</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleShare} title="Share">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {product.averageRating > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.averageRating) ? "fill-foreground text-foreground" : "text-border"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.averageRating}</span>
                <span className="text-sm text-muted-foreground">({product.totalReviews} reviews)</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
          </div>

          {/* Price */}
          <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
            <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-semibold text-foreground">{formatPrice(product.price)}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
                  <Badge variant="success" className="text-sm">
                    Save {formatPrice(product.mrp - product.price)}
                  </Badge>
                </>
              )}
            </div>
            {product.mrp > product.price && (
              <p className="text-xs text-success mt-1">
                {Math.round((1 - product.price / product.mrp) * 100)}% discount inclusive of all taxes
              </p>
            )}
          </div>

          {/* Stock */}
          <div className="mt-4">
            {product.stock > 0 ? (
              product.stock <= 5 ? (
                <p className="text-sm text-warning font-semibold">Hurry! Only {product.stock} left in stock</p>
              ) : (
                <p className="text-sm text-success font-semibold flex items-center gap-1">
                  <Check className="h-4 w-4" /> In Stock ({product.stock} available)
                </p>
              )
            ) : (
              <p className="text-sm text-destructive font-semibold">Out of Stock</p>
            )}
          </div>

          {/* Part Numbers */}
          {(product.partNumber || product.oemPartNumber) && (
            <div className="mt-3 p-3 bg-muted rounded-lg border border-border space-y-1 text-sm">
              {product.partNumber && (
                <div className="flex gap-2"><span className="text-muted-foreground">Part No:</span><span className="font-mono font-medium">{product.partNumber}</span></div>
              )}
              {product.oemPartNumber && (
                <div className="flex gap-2"><span className="text-muted-foreground">OEM No:</span><span className="font-mono font-medium">{product.oemPartNumber}</span></div>
              )}
            </div>
          )}

          {/* Seller */}
          {product.seller && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Sold by:</span>
              <span className="font-medium">{product.seller.sellerInfo?.businessName || product.seller.name}</span>
            </div>
          )}

          {/* Quantity & Cart */}
          {product.stock > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-l-lg transition-colors hover:bg-accent sm:h-9 sm:w-9"
                    disabled={qty <= 1 || cartBusy}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[3rem] border-x px-5 py-3 text-center font-semibold sm:py-1.5">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.stock, qty + 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-r-lg transition-colors hover:bg-accent sm:h-9 sm:w-9"
                    disabled={qty >= product.stock || cartBusy}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Total: <span className="font-bold text-foreground">{formatPrice(product.price * qty)}</span>
                </span>
              </div>
              <div className="flex gap-3">
                <Button size="lg" onClick={handleAddToCart} className="flex-1" variant="outline" disabled={cartBusy}>
                  {cartBusy ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-5 w-5 mr-2" />
                  )}
                  Add to Cart
                </Button>
                <Button size="lg" onClick={handleBuyNow} className="flex-1" disabled={cartBusy}>
                  {cartBusy ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Working…</>
                  ) : (
                    'Buy Now'
                  )}
                </Button>
                <Button size="lg" variant="outline" onClick={handleToggleWishlist} disabled={wishBusy} aria-label="Add to wishlist">
                  {wishBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className={`h-5 w-5 transition-colors ${wishlisted ? "fill-destructive text-destructive" : ""}`} />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Delivery & Features */}
          <div className="mt-6 space-y-2.5">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border">
              <Truck className="h-5 w-5 text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Free Delivery</p>
                <p className="text-xs text-muted-foreground">
                  {product.price >= 500
                    ? "Eligible for free shipping"
                    : `Add ${formatPrice(500 - product.price)} more for free shipping`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estimated delivery: 3-7 business days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
              <Shield className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="text-sm font-medium">Genuine Parts</p>
                <p className="text-xs text-muted-foreground">Quality assured genuine spare parts</p>
              </div>
            </div>
            {product.warranty && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                <Check className="h-5 w-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-medium">Warranty</p>
                  <p className="text-xs text-muted-foreground">{product.warranty}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({totalReviewCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-3 text-sm font-semibold">Highlights</h3>
                <ul className="mb-6 grid grid-cols-1 gap-x-8 text-sm sm:grid-cols-2">
                  <li className="flex items-center justify-between gap-4 border-b border-border py-2">
                    <span className="text-muted-foreground">Brand</span>
                    <span className="font-medium">{product.brand}</span>
                  </li>
                  {product.category?.name && (
                    <li className="flex items-center justify-between gap-4 border-b border-border py-2">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-medium">{product.category.name}</span>
                    </li>
                  )}
                  {product.partNumber && (
                    <li className="flex items-center justify-between gap-4 border-b border-border py-2">
                      <span className="text-muted-foreground">Part Number</span>
                      <span className="font-medium">{product.partNumber}</span>
                    </li>
                  )}
                  {product.oemPartNumber && (
                    <li className="flex items-center justify-between gap-4 border-b border-border py-2">
                      <span className="text-muted-foreground">OEM Number</span>
                      <span className="font-medium">{product.oemPartNumber}</span>
                    </li>
                  )}
                  {product.sku && (
                    <li className="flex items-center justify-between gap-4 border-b border-border py-2">
                      <span className="text-muted-foreground">SKU</span>
                      <span className="font-medium">{product.sku}</span>
                    </li>
                  )}
                  {product.warranty && (
                    <li className="flex items-center justify-between gap-4 border-b border-border py-2">
                      <span className="text-muted-foreground">Warranty</span>
                      <span className="font-medium">{product.warranty}</span>
                    </li>
                  )}
                  <li className="flex items-center justify-between gap-4 border-b border-border py-2">
                    <span className="text-muted-foreground">Availability</span>
                    <span className={`font-medium ${product.stock > 0 ? "text-success" : "text-destructive"}`}>
                      {product.stock > 0 ? "In stock" : "Out of stock"}
                    </span>
                  </li>
                </ul>

                <h3 className="mb-2 text-sm font-semibold">Description</h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="specs" className="mt-4">
            <Card>
              <CardContent className="p-6">
                {Object.keys(specs).length > 0 ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(specs).map(([key, value]) => (
                        <tr key={key} className="border-b last:border-0">
                          <td className="py-2.5 text-muted-foreground pr-4 w-1/3">{key}</td>
                          <td className="py-2.5 font-medium">{value as string}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground">No specifications available</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm border-t pt-4">
                  {product.weight && <div><span className="text-muted-foreground">Weight:</span> {product.weight} kg</div>}
                  {product.originCountry && <div><span className="text-muted-foreground">Origin:</span> {product.originCountry}</div>}
                  {product.warranty && <div><span className="text-muted-foreground">Warranty:</span> {product.warranty}</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compatibility" className="mt-4">
            <Card>
              <CardContent className="p-6">
                {product.compatibility?.length > 0 ? (
                  <div className="space-y-3">
                    {product.compatibility.map((compat: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
                        <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                          <Check className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {compat.isUniversal ? "Universal Fit" : (
                              <>
                                {compat.vehicleType && <span className="capitalize">{compat.vehicleType}</span>}
                                {compat.brand?.name && <span> — {compat.brand.name}</span>}
                                {compat.vehicleModel?.name && <span> {compat.vehicleModel.name}</span>}
                                {compat.variant?.name && <span> ({compat.variant.name})</span>}
                              </>
                            )}
                          </p>
                          {compat.yearFrom && compat.yearTo && (
                            <p className="text-xs text-muted-foreground">Years: {compat.yearFrom} — {compat.yearTo}</p>
                          )}
                          {compat.notes && <p className="text-xs text-muted-foreground mt-0.5">{compat.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No compatibility information available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <div className="space-y-6">
              {/* Rating Summary */}
              {totalReviewCount > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-8 flex-wrap">
                      <div className="text-center">
                        <p className="text-4xl font-bold">{product.averageRating}</p>
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.averageRating) ? "fill-foreground text-foreground" : "text-border"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{totalReviewCount} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1 min-w-[200px]">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const entry = ratingBreakdown.find((r: any) => r._id === star);
                          return <RatingBar key={star} star={star} count={entry?.count || 0} total={totalReviewCount} />;
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Review form */}
              {user && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Write a Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <Label>Rating</Label>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((r) => (
                            <button key={r} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: r })} className="p-0.5">
                              <Star className={`h-7 w-7 transition-colors ${r <= reviewForm.rating ? "fill-foreground text-foreground" : "text-border hover:text-foreground/60"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Title (optional)</Label>
                        <Input value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} placeholder="Review title" />
                      </div>
                      <div>
                        <Label>Review *</Label>
                        <Textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="Share your experience with this product..." required rows={3} />
                      </div>
                      <div>
                        <Label>Photos (optional)</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {reviewImagePreviews.map((src, i) => (
                            <div key={i} className="relative w-16 h-16 rounded border overflow-hidden">
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeReviewImage(i)} className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5">
                                <X className="h-2.5 w-2.5 text-white" />
                              </button>
                            </div>
                          ))}
                          {reviewImages.length < 5 && (
                            <label className="w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground">Add</span>
                              <input type="file" multiple accept="image/*" className="hidden" onChange={handleReviewImageChange} />
                            </label>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Max 5 photos</p>
                      </div>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "Submitting..." : "Submit Review"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Reviews list */}
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <Card key={review._id}>
                      <CardContent className="p-4">
                        {editingReview === review._id ? (
                          <div className="space-y-3">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((r) => (
                                <button key={r} type="button" onClick={() => setEditForm({ ...editForm, rating: r })}>
                                  <Star className={`h-5 w-5 ${r <= editForm.rating ? "fill-foreground text-foreground" : "text-border"}`} />
                                </button>
                              ))}
                            </div>
                            <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
                            <Textarea value={editForm.comment} onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })} rows={2} />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleEditReview(review._id)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingReview(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-foreground">{review.user?.name?.charAt(0) || "?"}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{review.user?.name || "User"}</p>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-foreground text-foreground" : "text-border"}`} />
                                    ))}
                                    <span className="text-xs text-muted-foreground ml-1">{formatDate(review.createdAt)}</span>
                                  </div>
                                </div>
                                {review.isVerifiedPurchase && (
                                  <Badge variant="secondary" className="text-xs"><Check className="h-3 w-3 mr-0.5" /> Verified</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {user && user.id === review.user?._id && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingReview(review._id); setEditForm({ rating: review.rating, title: review.title || "", comment: review.comment }); }}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteReview(review._id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {review.title && <p className="text-sm font-medium mt-2">{review.title}</p>}
                            <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                            {review.images && review.images.length > 0 && (
                              <div className="flex gap-2 mt-3">
                                {review.images.map((img: string, i: number) => (
                                  <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                    <img src={thumbUrl(img, 128)} alt="" className="w-16 h-16 rounded object-cover border hover:opacity-80 transition-opacity" loading="lazy" />
                                  </a>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleHelpful(review._id)}>
                                <ThumbsUp className="h-3 w-3 mr-1" /> Helpful ({review.helpful || 0})
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="h-12 w-12 mx-auto mb-3 text-border" />
                  <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="vp-heading mb-4">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {related.map((p: any) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
