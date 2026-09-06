"use client";
import { useState, useEffect } from "react";
import { Search, Check, X as XIcon, Eye, Ban, CheckCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => { loadProducts(); }, [page, statusFilter, search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "20" };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await api.getAdminProducts(params);
      setProducts(data.products || []);
      setPagination(data.pagination);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    try { await api.approveProduct(id); toast.success("Product approved"); loadProducts(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (id: string) => {
    try { await api.rejectProduct(id); toast.success("Product rejected"); loadProducts(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (id: string) => {
    try { await api.toggleProduct(id); toast.success("Product status updated"); loadProducts(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this product?")) return;
    try { await api.deleteAdminProduct(id); toast.success("Product deactivated"); loadProducts(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products Management</h1>
        <Badge variant="outline">{pagination?.total || 0} products</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, SKU, or brand..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter || "__all"} onValueChange={(v) => { setStatusFilter(v === "__all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-left py-3 px-4 font-medium">Price</th>
                  <th className="text-left py-3 px-4 font-medium">Stock</th>
                  <th className="text-left py-3 px-4 font-medium">Seller</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{formatPrice(p.price)}</p>
                      {p.mrp > p.price && <p className="text-xs text-muted-foreground line-through">{formatPrice(p.mrp)}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${p.stock <= 5 ? "text-red-600" : ""}`}>{p.stock}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{p.seller?.name || "—"}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <Badge className={p.isApproved ? getStatusColor("active") : getStatusColor("pending")} variant="outline">
                          {p.isApproved ? "Approved" : "Pending"}
                        </Badge>
                        {!p.isActive && <Badge className={getStatusColor("inactive")} variant="outline">Inactive</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!p.isApproved && p.isActive && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleApprove(p._id)} title="Approve">
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleReject(p._id)} title="Reject">
                              <XIcon className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        <Link href={`/products/${p.slug}`}>
                          <Button size="sm" variant="ghost" title="View"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => handleToggle(p._id)} title="Toggle active">
                          {p.isActive ? <Ban className="h-4 w-4 text-orange-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p._id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
