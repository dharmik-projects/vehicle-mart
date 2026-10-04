"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

const statusVariant = (status?: string) => {
  switch (status) {
    case "delivered":
    case "paid":
    case "active":
    case "approved":
      return "success" as const;
    case "pending":
    case "returned":
    case "refunded":
      return "warning" as const;
    case "cancelled":
    case "failed":
    case "rejected":
      return "destructive" as const;
    case "confirmed":
    case "processing":
    case "shipped":
    case "inactive":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

export default function SellerReturns() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const seqRef = useRef(0); // stale-response guard (filter/page changes)

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadReturns();
  }, [user, router, page, statusFilter]);

  const loadReturns = async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const params: any = { page: String(page), limit: "15" };
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await api.getSellerReturns(params);
      if (seq !== seqRef.current) return; // stale response — ignore out-of-order replies
      setReturns(data.returns || []);
      setPagination(data.pagination);
    } catch (err) {
      if (seq === seqRef.current) console.error(err);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Approve this return?")) return;
    try {
      await api.approveSellerReturn(id);
      toast.success("Return approved, refund initiated");
      loadReturns();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejection (optional):");
    try {
      await api.rejectSellerReturn(id, reason || undefined);
      toast.success("Return rejected");
      loadReturns();
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Returns & Refunds</h1>
        <p className="text-sm text-muted-foreground">Manage customer return requests</p>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="rounded-lg border border-border bg-card p-4"><div className="h-16 animate-pulse rounded bg-muted" /></div>)}
        </div>
      ) : returns.length > 0 ? (
        <>
          <div className="space-y-3">
            {returns.map((r) => (
              <div key={r._id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">#{r._id.slice(-8).toUpperCase()}</p>
                      <Badge variant={statusVariant(r.orderStatus)} className="text-xs">{r.orderStatus}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.user?.name} • {formatDate(r.createdAt)}</p>
                    {r.cancelReason && <p className="text-xs text-muted-foreground mt-1">Reason: {r.cancelReason}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-foreground">{formatPrice(r.total)}</p>
                    {/* Approve/Reject only while the return is still awaiting a
                        decision — once approved the backend marks the order
                        paymentStatus: 'refunded' (orderStatus stays 'returned'). */}
                    {r.orderStatus === "returned" && r.paymentStatus !== "refunded" && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleApprove(r._id)}>
                          <Check className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(r._id)}>
                          <X className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No return requests</h2>
          <p className="text-sm text-muted-foreground">Return requests will appear here</p>
        </div>
      )}
    </div>
  );
}
