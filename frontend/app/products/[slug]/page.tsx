"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star, ShoppingCart, Heart, Truck, Shield, ChevronRight, Minus, Plus,
  Check, Share2, ZoomIn, Package, Store, ThumbsUp, Pencil, Trash2,
  Camera, X, ChevronLeft as ChevronLeftIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { useAuthStore, useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 text-right">{star}★</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-muted-foreground text-xs">{count}</span>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
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
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rating: 5, title: "", comment: "" });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getProduct(slug);
        setProduct(data.product);

        if (data.product?._id) {
          const [relData, revData] = await Promise.all([
            api.getRelatedProducts(data.product._id),
            api.getProductReviews(data.product._id),
          ]);
          setRelated(relData.products || []);
          setReviews(revData.reviews || []);
          setRatingBreakdown(revData.ratingBreakdown || []);

          if (user) {
            try {
              const wlData = await api.checkWishlist(data.product._id);
              setWishlisted(wlData.wishlisted);
            } catch {}
          }
        }
      } catch (err) {
        toast.error("Product not found");
        router.push("/products");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, user, router]);

  const handleAddToCart = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      for (let i = 0; i < qty; i++) {
        await addItem(product._id);
      }
      toast.success(`Added ${qty} item${qty > 1 ? "s" : ""} to cart!`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBuyNow = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      for (let i = 0; i < qty; i++) {
        await addItem(product._id);
      }
      router.push("/checkout");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      const data = await api.toggleWishlist(product._id);
      setWishlisted(data.wishlisted);
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message);
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
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const specs = product.specifications instanceof Map ? Object.fromEntries(product.specifications) : (product.specifications || {});
  const totalReviewCount = ratingBreakdown.reduce((sum: number, r: any) => sum + r.count, 0);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        {product.category && (
          <>
            <Link href={`/products?category=${product.category._id}`} className="hover:text-primary transition-colors">
              {product.category.name}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </>
        )}
        <span className="text-foreground truncate">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div
            ref={imageContainerRef}
            className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3 relative cursor-crosshair"
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={handleMouseMove}
          >
            {product.images?.[selectedImage]?.url ? (
              <img
                src={product.images[selectedImage].url}
                alt={product.name}
                className="w-full h-full object-contain transition-transform duration-200"
                style={isZooming ? {
                  transform: "scale(1.8)",
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                } : {}}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Package className="h-24 w-24" />
              </div>
            )}
            {isZooming && product.images?.[selectedImage]?.url && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <ZoomIn className="h-3 w-3" /> Hover to zoom
              </div>
            )}
            {product.mrp > product.price && (
              <Badge className="absolute top-3 left-3 bg-red-500 text-white text-sm px-2.5 py-1">
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
                  className={`w-16 h-16 rounded border-2 overflow-hidden shrink-0 transition-all ${i === selectedImage ? "border-primary ring-1 ring-primary" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
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
              <h1 className="text-2xl font-bold mt-1">{product.name}</h1>
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
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.averageRating}</span>
                <span className="text-sm text-muted-foreground">({product.totalReviews} reviews)</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
          </div>

          {/* Price */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.mrp)}</span>
                  <Badge className="bg-green-100 text-green-800 text-sm">
                    Save {formatPrice(product.mrp - product.price)}
                  </Badge>
                </>
              )}
            </div>
            {product.mrp > product.price && (
              <p className="text-xs text-green-600 mt-1">
                {Math.round((1 - product.price / product.mrp) * 100)}% discount inclusive of all taxes
              </p>
            )}
          </div>

          {/* Stock */}
          <div className="mt-4">
            {product.stock > 0 ? (
              product.stock <= 5 ? (
                <p className="text-sm text-orange-600 font-semibold">Hurry! Only {product.stock} left in stock</p>
              ) : (
                <p className="text-sm text-green-600 font-semibold flex items-center gap-1">
                  <Check className="h-4 w-4" /> In Stock ({product.stock} available)
                </p>
              )
            ) : (
              <p className="text-sm text-red-600 font-semibold">Out of Stock</p>
            )}
          </div>

          {/* Part Numbers */}
          {(product.partNumber || product.oemPartNumber) && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
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
                    className="p-2.5 hover:bg-accent rounded-l-lg transition-colors"
                    disabled={qty <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-5 py-2 font-semibold min-w-[3rem] text-center border-x">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.stock, qty + 1))}
                    className="p-2.5 hover:bg-accent rounded-r-lg transition-colors"
                    disabled={qty >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Total: <span className="font-bold text-foreground">{formatPrice(product.price * qty)}</span>
                </span>
              </div>
              <div className="flex gap-3">
                <Button size="lg" onClick={handleAddToCart} className="flex-1" variant="outline">
                  <ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart
                </Button>
                <Button size="lg" onClick={handleBuyNow} className="flex-1">
                  Buy Now
                </Button>
                <Button size="lg" variant="outline" onClick={handleToggleWishlist}>
                  <Heart className={`h-5 w-5 transition-colors ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
              </div>
            </div>
          )}

          {/* Delivery & Features */}
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <Truck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
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
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Genuine Parts</p>
                <p className="text-xs text-muted-foreground">Quality assured genuine spare parts</p>
              </div>
            </div>
            {product.warranty && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Check className="h-5 w-5 text-green-600 shrink-0" />
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
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
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
                            <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
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
                              <Star className={`h-7 w-7 transition-colors ${r <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-300"}`} />
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
                            <label className="w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
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
                                  <Star className={`h-5 w-5 ${r <= editForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
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
                                  <span className="text-sm font-medium text-primary">{review.user?.name?.charAt(0) || "?"}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{review.user?.name || "User"}</p>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
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
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDeleteReview(review._id)}>
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
                                    <img src={img} alt="" className="w-16 h-16 rounded object-cover border hover:opacity-80 transition-opacity" />
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
                  <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Related Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {related.map((p: any) => (
              <Link key={p._id} href={`/products/${p.slug}`}>
                <Card className="hover:shadow-md transition-all h-full group">
                  <div className="aspect-square bg-gray-50 rounded-t-lg overflow-hidden">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="h-10 w-10" /></div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                    <h3 className="text-sm font-medium line-clamp-2 mt-1 group-hover:text-primary transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {p.averageRating > 0 && (
                        <>
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{p.averageRating}</span>
                        </>
                      )}
                    </div>
                    <span className="text-sm font-bold mt-1 block">{formatPrice(p.price)}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
