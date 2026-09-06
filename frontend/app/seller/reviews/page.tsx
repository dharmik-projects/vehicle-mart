"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronLeft, ChevronRight, ThumbsUp } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

export default function SellerReviews() {
  const router = useRouter();
  const { user } = useAuthStore();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground text-sm">Customer reviews for your products</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="animate-pulse space-y-2"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-200 rounded w-2/3" /></div></CardContent></Card>)}
        </div>
      ) : reviews.length > 0 ? (
        <>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{r.user?.name || "Anonymous"}</p>
                        <Badge variant="outline" className="text-xs">{r.isVerifiedPurchase ? "Verified" : "Unverified"}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.title && <p className="text-sm font-medium mt-2">{r.title}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">For: {r.product?.name || "Product"}</p>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleHelpful(r._id)}>
                      <ThumbsUp className="h-3 w-3 mr-1" /> Helpful ({r.helpful || 0})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No reviews yet for your products.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
