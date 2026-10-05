"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", icon: "", parent: "", sortOrder: "0" });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const data = await api.adminGetCategories();
      setCategories(data.categories || []);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", icon: "", parent: "", sortOrder: "0" });
    setDialogOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditing(cat);
    setForm({
      name: cat.name || "",
      description: cat.description || "",
      icon: cat.icon || "",
      parent: cat.parent?._id || cat.parent || "",
      sortOrder: String(cat.sortOrder ?? 0),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        name: form.name,
        description: form.description,
        icon: form.icon,
        sortOrder: Number(form.sortOrder),
      };
      if (form.parent) payload.parent = form.parent;

      if (editing) {
        await api.adminUpdateCategory(editing._id, payload);
        toast.success("Category updated");
      } else {
        await api.adminCreateCategory(payload);
        toast.success("Category created");
      }
      setDialogOpen(false);
      loadCategories();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this category?")) return;
    try { await api.adminDeleteCategory(id); toast.success("Category deactivated"); loadCategories(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><FolderTree className="h-6 w-6 shrink-0" /> Categories</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto min-h-11"><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
      </div>

      {/* Desktop (md+): table */}
      <div className="hidden md:block bg-card rounded-lg border border-border">
          <div className="vp-table-scroll">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Icon</th>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Parent</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Order</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="py-3 px-4 text-lg">{cat.icon || "—"}</td>
                    <td className="py-3 px-4 font-medium">{cat.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{cat.parent?.name || "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadgeVariant(cat.isActive ? "active" : "inactive")}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{cat.sortOrder ?? 0}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(cat._id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground bg-muted">No categories found</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Mobile: compact cards */}
      <div className="md:hidden space-y-3">
        {categories.map((cat) => (
          <div key={cat._id} className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">{cat.icon || "—"}</span>
              <span className="font-semibold text-foreground truncate">{cat.name}</span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Parent</span>
                <span className="text-foreground truncate text-right min-w-0">{cat.parent?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Status</span>
                <Badge variant={statusBadgeVariant(cat.isActive ? "active" : "inactive")}>
                  {cat.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground shrink-0">Order</span>
                <span className="text-foreground">{cat.sortOrder ?? 0}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => openEdit(cat)} title="Edit" className="min-h-10 min-w-10"><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(cat._id)} title="Delete" className="min-h-10 min-w-10"><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="text-center py-10 bg-card border border-border rounded-lg text-sm text-muted-foreground">No categories found</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="sm:col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engine Parts" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
              <div>
                <Label>Icon (emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🔧" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Parent Category</Label>
              <Select value={form.parent || "__none"} onValueChange={(v) => setForm({ ...form, parent: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None (top-level)</SelectItem>
                  {categories.filter((c) => c.isActive && c._id !== editing?._id).map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.icon ? `${c.icon} ` : ""}{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="min-h-11">Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name.trim()} className="min-h-11">{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
