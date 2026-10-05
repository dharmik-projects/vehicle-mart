"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    code: "", description: "", discountType: "percentage" as string,
    discountValue: "", minOrderAmount: "", maxDiscount: "",
    usageLimit: "", expiresAt: "",
  });

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    try {
      const data = await api.getAdminCoupons();
      setCoupons(data.coupons || []);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", description: "", discountType: "percentage", discountValue: "", minOrderAmount: "", maxDiscount: "", usageLimit: "", expiresAt: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      code: c.code, description: c.description || "", discountType: c.discountType,
      discountValue: String(c.discountValue), minOrderAmount: String(c.minOrderAmount || 0),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : "", usageLimit: c.usageLimit ? String(c.usageLimit) : "",
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        code: form.code, description: form.description, discountType: form.discountType,
        discountValue: Number(form.discountValue), minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0, expiresAt: form.expiresAt,
      };
      if (editing) { await api.updateAdminCoupon(editing._id, payload); toast.success("Coupon updated"); }
      else { await api.createAdminCoupon(payload); toast.success("Coupon created"); }
      setDialogOpen(false); loadCoupons();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this coupon?")) return;
    try { await api.deleteAdminCoupon(id); toast.success("Coupon deactivated"); loadCoupons(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Coupons & Discounts</h1>
          <p className="text-sm text-muted-foreground">{coupons.length} total coupons</p>
        </div>
        <Button onClick={openCreate} className="rounded-lg w-full sm:w-auto min-h-11"><Plus className="h-4 w-4 mr-1" /> Add Coupon</Button>
      </div>

      {/* Desktop (md+): table */}
      <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
        <div className="vp-table-scroll">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Code</th>
                <th className="text-left py-3 px-4 font-medium">Discount</th>
                <th className="text-left py-3 px-4 font-medium">Min Order</th>
                <th className="text-left py-3 px-4 font-medium">Max Discount</th>
                <th className="text-left py-3 px-4 font-medium">Usage</th>
                <th className="text-left py-3 px-4 font-medium">Expires</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c._id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">{c.code}</td>
                    <td className="py-3 px-4 text-foreground">{c.discountType === "percentage" ? `${c.discountValue}%` : formatPrice(c.discountValue)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{c.minOrderAmount ? formatPrice(c.minOrderAmount) : "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{c.maxDiscount ? formatPrice(c.maxDiscount) : "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{c.usedCount}/{c.usageLimit || "∞"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(c.expiresAt)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadgeVariant(!c.isActive ? "inactive" : expired ? "cancelled" : "active")}>
                        {!c.isActive ? "Inactive" : expired ? "Expired" : "Active"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(c._id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                );
              })}
              {coupons.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground bg-muted">No coupons found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: compact cards */}
      <div className="md:hidden space-y-3">
        {coupons.map((c) => {
          const expired = new Date(c.expiresAt) < new Date();
          return (
            <div key={c._id} className="bg-card rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-foreground truncate">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.discountType === "percentage" ? `${c.discountValue}%` : formatPrice(c.discountValue)} off
                  </p>
                </div>
                <Badge variant={statusBadgeVariant(!c.isActive ? "inactive" : expired ? "cancelled" : "active")}>
                  {!c.isActive ? "Inactive" : expired ? "Expired" : "Active"}
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Min Order</span>
                  <span className="text-foreground tabular-nums">{c.minOrderAmount ? formatPrice(c.minOrderAmount) : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Max Discount</span>
                  <span className="text-foreground tabular-nums">{c.maxDiscount ? formatPrice(c.maxDiscount) : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Usage</span>
                  <span className="text-foreground tabular-nums">{c.usedCount}/{c.usageLimit || "∞"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground shrink-0">Expires</span>
                  <span className="text-xs text-muted-foreground text-right">{formatDate(c.expiresAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Edit" className="text-muted-foreground hover:text-foreground min-h-10 min-w-10"><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c._id)} title="Delete" className="text-muted-foreground hover:text-destructive min-h-10 min-w-10"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          );
        })}
        {coupons.length === 0 && (
          <div className="text-center py-10 bg-card border border-border rounded-lg text-sm text-muted-foreground">No coupons found</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Coupon</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="sm:col-span-2"><Label className="text-xs">Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" className="mt-1 h-11 sm:h-9" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 border-border" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
              <div><Label className="text-xs">Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger className="mt-1 h-11 sm:h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Discount Value</Label><Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
              <div><Label className="text-xs">Min Order (₹)</Label><Input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
              <div><Label className="text-xs">Max Discount (₹)</Label><Input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
              <div><Label className="text-xs">Usage Limit</Label><Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="0 = unlimited" className="mt-1 h-11 sm:h-9" /></div>
              <div><Label className="text-xs">Expires At</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
            </div>
            <div className="sm:col-span-2 flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg min-h-11">Cancel</Button>
              <Button onClick={handleSave} disabled={!form.code.trim() || !form.discountValue} className="rounded-lg min-h-11">{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
