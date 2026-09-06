"use client";
import { useState, useEffect } from "react";
import { Trash2, Star, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6" /> Reviews & Ratings</h1>
        <Badge variant="outline">{pagination?.total || 0} reviews</Badge>
      </div>

      <div className="space-y-3">
        {reviews.map((r) => (
          <Card key={r._id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">{r.user?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    </div>
                    <span className="text-sm font-medium">{r.user?.name || "User"}</span>
                    {r.isVerifiedPurchase && <Badge variant="secondary" className="text-[10px]">Verified</Badge>}
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    ))}
                  </div>
                  {r.title && <p className="text-sm font-medium">{r.title}</p>}
                  <p className="text-sm text-muted-foreground mt-0.5">{r.comment}</p>
                  <p className="text-xs text-muted-foreground mt-1">Product: {r.product?.name || "—"}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(r._id)} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No reviews found</CardContent></Card>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
