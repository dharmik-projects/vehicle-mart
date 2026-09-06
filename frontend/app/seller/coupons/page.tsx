"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tag, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function SellerCoupons() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [form, setForm] = useState({
    code: "", description: "", discountType: "percentage", discountValue: "",
    minOrderAmount: "", maxDiscount: "", usageLimit: "", expiresAt: "",
  });

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadCoupons();
  }, [user, router, page]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerCoupons({ page: String(page), limit: "10" });
      setCoupons(data.coupons || []);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ code: "", description: "", discountType: "percentage", discountValue: "", minOrderAmount: "", maxDiscount: "", usageLimit: "", expiresAt: "" });
    setEditingCoupon(null);
  };

  const handleOpenForm = (coupon?: any) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setForm({
        code: coupon.code || "",
        description: coupon.description || "",
        discountType: coupon.discountType || "percentage",
        discountValue: String(coupon.discountValue || ""),
        minOrderAmount: String(coupon.minOrderAmount || ""),
        maxDiscount: String(coupon.maxDiscount || ""),
        usageLimit: String(coupon.usageLimit || ""),
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split("T")[0] : "",
      });
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
        expiresAt: new Date(form.expiresAt).toISOString(),
      };
      if (editingCoupon) {
        await api.updateSellerCoupon(editingCoupon._id, payload);
        toast.success("Coupon updated");
      } else {
        await api.createSellerCoupon(payload);
        toast.success("Coupon created");
      }
      setShowForm(false);
      resetForm();
      loadCoupons();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await api.deleteSellerCoupon(id);
      toast.success("Coupon deleted");
      loadCoupons();
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coupons</h1>
          <p className="text-muted-foreground text-sm">Create and manage discount coupons</p>
        </div>
        <Button onClick={() => handleOpenForm()}><Plus className="h-4 w-4 mr-2" /> Add Coupon</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="animate-pulse h-16 bg-gray-200 rounded" /></CardContent></Card>)}
        </div>
      ) : coupons.length > 0 ? (
        <>
          <div className="space-y-3">
            {coupons.map((c) => (
              <Card key={c._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm font-mono">{c.code}</p>
                        <Badge variant={c.isActive ? "default" : "destructive"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.discountType === "percentage" ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                        {c.minOrderAmount > 0 && ` • Min order ₹${c.minOrderAmount}`}
                        {c.maxDiscount && ` • Max ₹${c.maxDiscount}`}
                      </p>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Used: {c.usedCount || 0}/{c.usageLimit || "∞"} • Expires: {formatDate(c.expiresAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleOpenForm(c)}><Edit className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(c._id)}><Trash2 className="h-3 w-3" /></Button>
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
          <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No coupons created yet.</p>
        </CardContent></Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Coupon Code *</Label><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE10" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Value *</Label><Input type="number" required min="0" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min Order (₹)</Label><Input type="number" min="0" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} /></div>
              <div><Label>Max Discount (₹)</Label><Input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Usage Limit</Label><Input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="0 = unlimited" /></div>
              <div><Label>Expires *</Label><Input type="date" required value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" className="flex-1">{editingCoupon ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
