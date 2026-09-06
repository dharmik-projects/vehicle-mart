"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

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
        code: form.code,
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : 0,
        expiresAt: form.expiresAt,
      };
      if (editing) {
        await api.updateAdminCoupon(editing._id, payload);
        toast.success("Coupon updated");
      } else {
        await api.createAdminCoupon(payload);
        toast.success("Coupon created");
      }
      setDialogOpen(false);
      loadCoupons();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this coupon?")) return;
    try { await api.deleteAdminCoupon(id); toast.success("Coupon deactivated"); loadCoupons(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6" /> Coupons & Discounts</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Coupon</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
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
                    <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono font-bold">{c.code}</td>
                      <td className="py-3 px-4">
                        {c.discountType === "percentage" ? `${c.discountValue}%` : formatPrice(c.discountValue)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{c.minOrderAmount ? formatPrice(c.minOrderAmount) : "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.maxDiscount ? formatPrice(c.maxDiscount) : "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{c.usedCount}/{c.usageLimit || "∞"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(c.expiresAt)}</td>
                      <td className="py-3 px-4">
                        <Badge className={!c.isActive ? getStatusColor("inactive") : expired ? getStatusColor("cancelled") : getStatusColor("active")}>
                          {!c.isActive ? "Inactive" : expired ? "Expired" : "Active"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(c._id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No coupons found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Coupon</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SAVE20" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Discount Value</Label><Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Order (₹)</Label><Input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} /></div>
              <div><Label>Max Discount (₹)</Label><Input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Usage Limit</Label><Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="0 = unlimited" /></div>
              <div><Label>Expires At</Label><Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.code.trim() || !form.discountValue}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
