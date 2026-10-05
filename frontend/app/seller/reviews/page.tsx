"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronLeft, ChevronRight, ThumbsUp } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

export default function SellerReviews() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadReviews();
  }, [user, router, page]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerReviews({ page: String(page), limit: "15" });
      setReviews(data.reviews || []);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleHelpful = async (id: string) => {
    try {
      await api.markReviewHelpful(id);
      toast.success("Marked as helpful");
      loadReviews();
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="vp-main space-y-5 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reviews</h1>
        <p className="text-sm text-muted-foreground">Customer reviews for your products</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="rounded-lg border border-border bg-card p-4"><div className="animate-pulse space-y-2"><div className="h-4 bg-muted rounded w-1/3" /><div className="h-3 bg-muted rounded w-2/3" /></div></div>)}
        </div>
      ) : reviews.length > 0 ? (
        <>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{r.user?.name || "Anonymous"}</p>
                      <Badge variant="outline" className="text-xs">{r.isVerifiedPurchase ? "Verified" : "Unverified"}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "text-foreground fill-foreground" : "text-border"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.title && <p className="text-sm font-medium mt-2 text-foreground break-words">{r.title}</p>}
                    <p className="text-sm text-muted-foreground mt-1 break-words">{r.comment}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground min-w-0 flex-1 break-words">For: {r.product?.name || "Product"}</p>
                  <Button size="sm" variant="ghost" className="min-h-10 text-xs text-muted-foreground hover:text-foreground" onClick={() => handleHelpful(r._id)}>
                    <ThumbsUp className="h-3 w-3 mr-1" /> Helpful ({r.helpful || 0})
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="min-h-10 min-w-10" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /><span className="sr-only">Previous page</span></Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" className="min-h-10 min-w-10" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /><span className="sr-only">Next page</span></Button>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Star className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No reviews yet</h2>
          <p className="text-sm text-muted-foreground">Reviews for your products will appear here</p>
        </div>
      )}
    </div>
  );
}
