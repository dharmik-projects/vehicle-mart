"use client";
import { useState, useEffect } from "react";
import { Trash2, Star } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => { loadReviews(); }, [page]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminReviews({ page: String(page), limit: "20" });
      setReviews(data.reviews || []);
      setPagination(data.pagination);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      await api.deleteAdminReview(id);
      toast.success("Review deleted");
      loadReviews();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reviews & Ratings</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} total reviews</p>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r._id} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-foreground">{r.user?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{r.user?.name || "User"}</span>
                  {r.isVerifiedPurchase && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                  <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
                {r.title && <p className="text-sm font-medium text-foreground">{r.title}</p>}
                <p className="text-sm text-muted-foreground mt-0.5">{r.comment}</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">Product: {r.product?.name || "—"}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(r._id)} title="Delete review" className="shrink-0 min-h-10 min-w-10 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">No reviews found</h2>
            <p className="text-sm text-muted-foreground">Reviews will appear here</p>
          </div>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg min-h-10">Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg min-h-10">Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
