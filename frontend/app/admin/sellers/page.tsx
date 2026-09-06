"use client";
import { useState, useEffect } from "react";
import { Search, Check, X as XIcon, Ban, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => { loadSellers(); }, [page, filter, search]);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "20" };
      if (filter) params.approved = filter;
      if (search) params.search = search;
      const data = await api.getAdminSellers(params);
      setSellers(data.sellers || []);
      setPagination(data.pagination);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    try { await api.approveSeller(id); toast.success("Seller approved"); loadSellers(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (id: string) => {
    try { await api.rejectSeller(id); toast.success("Seller rejected"); loadSellers(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (id: string) => {
    try { await api.toggleSeller(id); toast.success("Seller status updated"); loadSellers(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Seller Management</h1>
        <Badge variant="outline">{pagination?.total || 0} sellers</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search sellers..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
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
          <Card key={s._id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{s.name?.charAt(0)?.toUpperCase()}</span>
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
                  <Badge className={s.sellerInfo?.isApproved ? getStatusColor("active") : getStatusColor("pending")}>
                    {s.sellerInfo?.isApproved ? "Approved" : "Pending"}
                  </Badge>
                  <Badge className={s.isActive ? getStatusColor("active") : getStatusColor("inactive")}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {!s.sellerInfo?.isApproved && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(s._id)}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(s._id)}>
                        <XIcon className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {s.sellerInfo?.isApproved && (
                    <Button size="sm" variant="outline" onClick={() => handleToggle(s._id)}>
                      {s.isActive ? <Ban className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                      {s.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sellers.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No sellers found</CardContent></Card>
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
