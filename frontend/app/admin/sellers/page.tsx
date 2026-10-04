"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Check, X as XIcon, Ban, CheckCircle, Store, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

function statusBadgeVariant(status: string) {
  switch (status) {
    case "active":
    case "delivered":
    case "paid":
    case "confirmed":
      return "success";
    case "pending":
    case "processing":
    case "shipped":
    case "refunded":
      return "warning";
    case "cancelled":
    case "failed":
    case "returned":
      return "destructive";
    case "inactive":
      return "secondary";
    default:
      return "outline";
  }
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // responsive input value
  const [debouncedSearch, setDebouncedSearch] = useState(""); // what the fetch uses
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0); // stale-response guard
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => { loadSellers(); }, [page, filter, debouncedSearch]);

  /* Debounced (300ms) search: typing stays instant, the fetch only runs when
     the user pauses — and the page resets to 1 with the new term. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const loadSellers = async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const params: any = { page: String(page), limit: "20" };
      if (filter) params.approved = filter;
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await api.getAdminSellers(params);
      if (seq !== seqRef.current) return; // stale response — ignore out-of-order replies
      setSellers(data.sellers || []);
      setPagination(data.pagination);
    } catch (err: any) {
      if (seq === seqRef.current) toast.error(err.message);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setBusyId(id); setBusyAction("approve");
    try { await api.approveSeller(id); toast.success("Seller approved"); loadSellers(); }
    catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); setBusyAction(null); }
  };

  const handleReject = async (id: string) => {
    setBusyId(id); setBusyAction("reject");
    try { await api.rejectSeller(id); toast.success("Seller rejected"); loadSellers(); }
    catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); setBusyAction(null); }
  };

  const handleToggle = async (id: string) => {
    setBusyId(id); setBusyAction("toggle");
    try { await api.toggleSeller(id); toast.success("Seller status updated"); loadSellers(); }
    catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); setBusyAction(null); }
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Seller Management</h1>
        <Badge variant="outline">{pagination?.total || 0} sellers</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sellers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter || "__all"} onValueChange={(v) => { setFilter(v === "__all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All</SelectItem>
            <SelectItem value="true">Approved</SelectItem>
            <SelectItem value="false">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {sellers.map((s) => (
          <div key={s._id} className="bg-card rounded-lg border border-border">
              <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">{s.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium">{s.sellerInfo?.businessName || s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    {s.sellerInfo?.businessAddress && (
                      <p className="text-xs text-muted-foreground">{s.sellerInfo.businessAddress}</p>
                    )}
                    {s.sellerInfo?.gstNumber && (
                      <p className="text-xs text-muted-foreground">GST: {s.sellerInfo.gstNumber}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusBadgeVariant(s.sellerInfo?.isApproved ? "active" : "pending")}>
                    {s.sellerInfo?.isApproved ? "Approved" : "Pending"}
                  </Badge>
                  <Badge variant={statusBadgeVariant(s.isActive ? "active" : "inactive")}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {!s.sellerInfo?.isApproved && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(s._id)} disabled={busyId === s._id}>
                        {busyId === s._id && busyAction === "approve"
                          ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          : <Check className="h-3 w-3 mr-1" />}
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(s._id)} disabled={busyId === s._id}>
                        {busyId === s._id && busyAction === "reject"
                          ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          : <XIcon className="h-3 w-3 mr-1" />}
                        Reject
                      </Button>
                    </>
                  )}
                  {s.sellerInfo?.isApproved && (
                    <Button size="sm" variant="outline" onClick={() => handleToggle(s._id)} disabled={busyId === s._id}>
                      {busyId === s._id && busyAction === "toggle" ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : s.isActive ? (
                        <Ban className="h-3 w-3 mr-1" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      {s.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              </div>
              </div>
          </div>
        ))}
        {sellers.length === 0 && (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">No sellers found</h2>
            <p className="text-sm text-muted-foreground">Sellers will appear here</p>
          </div>
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
