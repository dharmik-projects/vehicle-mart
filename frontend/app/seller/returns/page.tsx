"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Search, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function SellerReturns() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadReturns();
  }, [user, router, page, statusFilter]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "15" };
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await api.getSellerReturns(params);
      setReturns(data.returns || []);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Returns & Refunds</h1>
        <p className="text-muted-foreground text-sm">Manage customer return requests</p>
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
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="animate-pulse h-16 bg-gray-200 rounded" /></CardContent></Card>)}
        </div>
      ) : returns.length > 0 ? (
        <>
          <div className="space-y-3">
            {returns.map((r) => (
              <Card key={r._id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">#{r._id.slice(-8).toUpperCase()}</p>
                        <Badge className={getStatusColor(r.orderStatus)}>{r.orderStatus}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.user?.name} • {formatDate(r.createdAt)}</p>
                      {r.cancelReason && <p className="text-xs text-orange-600 mt-1">Reason: {r.cancelReason}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold">{formatPrice(r.total)}</p>
                      {(!r.orderStatus || r.orderStatus === 'returned') && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleApprove(r._id)}>
                            <Check className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleReject(r._id)}>
                            <X className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
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
          <RotateCcw className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No return requests found.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
