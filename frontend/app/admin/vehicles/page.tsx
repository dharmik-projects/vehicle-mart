"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Car } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";

const vehicleTypes = ["2-wheeler", "car", "truck", "tractor", "ev", "three-wheeler", "bus"];
const fuelTypes = ["petrol", "diesel", "electric", "hybrid", "cng", "lpg"];

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

export default function AdminVehiclesPage() {
  const [tab, setTab] = useState("brands");
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [brandForm, setBrandForm] = useState({ name: "", vehicleType: "" as string });
  const [modelForm, setModelForm] = useState({ name: "", brand: "", vehicleType: "" as string });
  const [variantForm, setVariantForm] = useState({ name: "", vehicleModel: "", yearFrom: "", yearTo: "", engineType: "", engineCC: "", fuelType: "" as string, transmission: "" });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [b, m, v] = await Promise.all([api.adminGetBrands(), api.adminGetModels(), api.adminGetVariants()]);
      setBrands(b.brands || []);
      setModels(m.models || []);
      setVariants(v.variants || []);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const openBrandDialog = (b?: any) => {
    setEditing(b || null);
    setBrandForm(b ? { name: b.name, vehicleType: b.vehicleType?.[0] || "" } : { name: "", vehicleType: "" });
    setDialogOpen(true);
  };

  const openModelDialog = (m?: any) => {
    setEditing(m || null);
    setModelForm(m ? { name: m.name, brand: m.brand?._id || m.brand, vehicleType: m.vehicleType } : { name: "", brand: "", vehicleType: "" });
    setDialogOpen(true);
  };

  const openVariantDialog = (v?: any) => {
    setEditing(v || null);
    setVariantForm(v ? {
      name: v.name, vehicleModel: v.vehicleModel?._id || v.vehicleModel,
      yearFrom: String(v.yearFrom), yearTo: String(v.yearTo), engineType: v.engineType,
      engineCC: v.engineCC ? String(v.engineCC) : "", fuelType: v.fuelType, transmission: v.transmission || "",
    } : { name: "", vehicleModel: "", yearFrom: "", yearTo: "", engineType: "", engineCC: "", fuelType: "", transmission: "" });
    setDialogOpen(true);
  };

  const handleSaveBrand = async () => {
    try {
      const payload = { name: brandForm.name, vehicleType: [brandForm.vehicleType] };
      if (editing) { await api.adminUpdateBrand(editing._id, payload); toast.success("Brand updated"); }
      else { await api.adminCreateBrand(payload); toast.success("Brand created"); }
      setDialogOpen(false); loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveModel = async () => {
    try {
      const payload = { name: modelForm.name, brand: modelForm.brand, vehicleType: modelForm.vehicleType };
      if (editing) { await api.adminUpdateModel(editing._id, payload); toast.success("Model updated"); }
      else { await api.adminCreateModel(payload); toast.success("Model created"); }
      setDialogOpen(false); loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveVariant = async () => {
    try {
      const payload = { ...variantForm, yearFrom: Number(variantForm.yearFrom), yearTo: Number(variantForm.yearTo), engineCC: variantForm.engineCC ? Number(variantForm.engineCC) : undefined };
      if (editing) { await api.adminUpdateVariant(editing._id, payload); toast.success("Variant updated"); }
      else { await api.adminCreateVariant(payload); toast.success("Variant created"); }
      setDialogOpen(false); loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm("Deactivate brand?")) return;
    try { await api.adminDeleteBrand(id); toast.success("Brand deactivated"); loadAll(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm("Deactivate model?")) return;
    try { await api.adminDeleteModel(id); toast.success("Model deactivated"); loadAll(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm("Deactivate variant?")) return;
    try { await api.adminDeleteVariant(id); toast.success("Variant deactivated"); loadAll(); }
    catch (err: any) { toast.error(err.message); }
  };

  const currentDialog = tab === "brands" ? "brand" : tab === "models" ? "model" : "variant";

  return (
    <div className="vp-main space-y-5 fade-in">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><Car className="h-6 w-6 shrink-0" /> Vehicle Management</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap gap-1 sm:w-auto">
          <TabsTrigger value="brands" className="min-h-10 px-3 sm:px-4">Brands ({brands.length})</TabsTrigger>
          <TabsTrigger value="models" className="min-h-10 px-3 sm:px-4">Models ({models.length})</TabsTrigger>
          <TabsTrigger value="variants" className="min-h-10 px-3 sm:px-4">Variants ({variants.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openBrandDialog()} className="w-full sm:w-auto min-h-11"><Plus className="h-4 w-4 mr-1" /> Add Brand</Button>
          </div>
          <div className="bg-card rounded-lg border border-border">
            <div className="vp-table-scroll">
              <table className="w-full text-sm min-w-[560px]">
                <thead><tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Vehicle Type</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b._id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="py-3 px-4 font-medium">{b.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{b.vehicleType?.join(", ") || "—"}</td>
                      <td className="py-3 px-4"><Badge variant={statusBadgeVariant(b.isActive ? "active" : "inactive")}>{b.isActive ? "Active" : "Inactive"}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openBrandDialog(b)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteBrand(b._id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="models" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openModelDialog()} className="w-full sm:w-auto min-h-11"><Plus className="h-4 w-4 mr-1" /> Add Model</Button>
          </div>
          <div className="bg-card rounded-lg border border-border">
            <div className="vp-table-scroll">
              <table className="w-full text-sm min-w-[720px]">
                <thead><tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Brand</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m._id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="py-3 px-4 font-medium">{m.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{m.brand?.name || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{m.vehicleType}</td>
                      <td className="py-3 px-4"><Badge variant={statusBadgeVariant(m.isActive ? "active" : "inactive")}>{m.isActive ? "Active" : "Inactive"}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openModelDialog(m)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteModel(m._id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="variants" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openVariantDialog()} className="w-full sm:w-auto min-h-11"><Plus className="h-4 w-4 mr-1" /> Add Variant</Button>
          </div>
          <div className="bg-card rounded-lg border border-border">
            <div className="vp-table-scroll">
              <table className="w-full text-sm min-w-[900px]">
                <thead><tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Model</th>
                  <th className="text-left py-3 px-4 font-medium">Years</th>
                  <th className="text-left py-3 px-4 font-medium">Engine</th>
                  <th className="text-left py-3 px-4 font-medium">Fuel</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v._id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="py-3 px-4 font-medium">{v.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{v.vehicleModel?.name || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{v.yearFrom} - {v.yearTo}</td>
                      <td className="py-3 px-4 text-muted-foreground">{v.engineType}{v.engineCC ? ` ${v.engineCC}cc` : ""}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{v.fuelType}</td>
                      <td className="py-3 px-4"><Badge variant={statusBadgeVariant(v.isActive ? "active" : "inactive")}>{v.isActive ? "Active" : "Inactive"}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openVariantDialog(v)}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteVariant(v._id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Create"} {currentDialog === "brand" ? "Brand" : currentDialog === "model" ? "Model" : "Variant"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {currentDialog === "brand" && (
              <>
                <div><Label>Brand Name</Label><Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} /></div>
                <div><Label>Vehicle Type</Label>
                  <Select value={brandForm.vehicleType || "__none"} onValueChange={(v) => setBrandForm({ ...brandForm, vehicleType: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {currentDialog === "model" && (
              <>
                <div className="sm:col-span-2"><Label>Model Name</Label><Input value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} /></div>
                <div><Label>Brand</Label>
                  <Select value={modelForm.brand || "__none"} onValueChange={(v) => setModelForm({ ...modelForm, brand: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {brands.filter((b) => b.isActive).map((b) => <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Vehicle Type</Label>
                  <Select value={modelForm.vehicleType || "__none"} onValueChange={(v) => setModelForm({ ...modelForm, vehicleType: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {vehicleTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {currentDialog === "variant" && (
              <>
                <div className="sm:col-span-2"><Label>Variant Name</Label><Input value={variantForm.name} onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Model</Label>
                  <Select value={variantForm.vehicleModel || "__none"} onValueChange={(v) => setVariantForm({ ...variantForm, vehicleModel: v === "__none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {models.filter((m) => m.isActive).map((m) => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
                  <div><Label>Year From</Label><Input type="number" value={variantForm.yearFrom} onChange={(e) => setVariantForm({ ...variantForm, yearFrom: e.target.value })} /></div>
                  <div><Label>Year To</Label><Input type="number" value={variantForm.yearTo} onChange={(e) => setVariantForm({ ...variantForm, yearTo: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
                  <div><Label>Engine Type</Label><Input value={variantForm.engineType} onChange={(e) => setVariantForm({ ...variantForm, engineType: e.target.value })} placeholder="e.g. Inline-4" /></div>
                  <div><Label>Engine CC</Label><Input type="number" value={variantForm.engineCC} onChange={(e) => setVariantForm({ ...variantForm, engineCC: e.target.value })} placeholder="e.g. 1500" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
                  <div><Label>Fuel Type</Label>
                    <Select value={variantForm.fuelType || "__none"} onValueChange={(v) => setVariantForm({ ...variantForm, fuelType: v === "__none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Select fuel" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        {fuelTypes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Transmission</Label>
                    <Select value={variantForm.transmission || "__none"} onValueChange={(v) => setVariantForm({ ...variantForm, transmission: v === "__none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">None</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="automatic">Automatic</SelectItem>
                        <SelectItem value="cvt">CVT</SelectItem>
                        <SelectItem value="amt">AMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="sm:col-span-2 flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="min-h-11">Cancel</Button>
              <Button onClick={currentDialog === "brand" ? handleSaveBrand : currentDialog === "model" ? handleSaveModel : handleSaveVariant} className="min-h-11">
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
