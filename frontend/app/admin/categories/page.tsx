"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { api } from "@/lib/api";
import { getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><FolderTree className="h-6 w-6" /> Categories</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Category</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
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
                  <tr key={cat._id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 text-lg">{cat.icon || "—"}</td>
                    <td className="py-3 px-4 font-medium">{cat.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{cat.parent?.name || "—"}</td>
                    <td className="py-3 px-4">
                      <Badge className={cat.isActive ? getStatusColor("active") : getStatusColor("inactive")}>
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
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No categories found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Create Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engine Parts" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon (emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🔧" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              </div>
            </div>
            <div>
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
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name.trim()}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
