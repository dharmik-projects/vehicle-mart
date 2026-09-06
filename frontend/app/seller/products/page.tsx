"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Edit, Trash2, Upload, X, Package,
  ChevronLeft, ChevronRight, Car, Bike, Truck as TruckIcon,
  Zap, CircleDot, Globe,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

const VEHICLE_TYPES = [
  { value: "car", label: "Car", icon: Car },
  { value: "2-wheeler", label: "2-Wheeler", icon: Bike },
  { value: "truck", label: "Truck", icon: TruckIcon },
  { value: "tractor", label: "Tractor", icon: CircleDot },
  { value: "ev", label: "EV", icon: Zap },
  { value: "three-wheeler", label: "3-Wheeler", icon: CircleDot },
  { value: "bus", label: "Bus", icon: TruckIcon },
];

interface CompatibilityEntry {
  vehicleType: string;
  brand: string;
  brandName: string;
  vehicleModel: string;
  modelName: string;
  variant: string;
  variantName: string;
  yearFrom: string;
  yearTo: string;
  notes: string;
}

export default function SellerProducts() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", brand: "", category: "", price: "", mrp: "",
    partNumber: "", oemPartNumber: "", stock: "", lowStockThreshold: "5",
    warranty: "", weight: "", tags: "", originCountry: "",
  });

  // Vehicle compatibility state
  const [compatType, setCompatType] = useState<"universal" | "vehicleType" | "specific">("universal");
  const [compatVehicleType, setCompatVehicleType] = useState("");
  const [compatEntries, setCompatEntries] = useState<CompatibilityEntry[]>([]);

  // Vehicle dropdown data
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) {
      router.push("/login");
      return;
    }
    loadProducts();
    loadCategories();
    loadBrands();
  }, [user, router, page, statusFilter, search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "12" };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;
      const data = await api.getSellerProducts(params);
      setProducts(data.products || []);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategoriesFlat();
      setCategories(data.categories || []);
    } catch (err) { console.error(err); }
  };

  const loadBrands = async () => {
    try {
      const data = await api.getBrands();
      setBrands(data.brands || []);
    } catch (err) { console.error(err); }
  };

  const loadModels = async (brandId: string) => {
    if (!brandId) { setModels([]); return; }
    try {
      setLoadingModels(true);
      const data = await api.getModels(brandId);
      setModels(data.models || []);
    } catch (err) { console.error(err); }
    setLoadingModels(false);
  };

  const loadVariants = async (modelId: string) => {
    if (!modelId) { setVariants([]); return; }
    try {
      setLoadingVariants(true);
      const data = await api.getVariants(modelId);
      setVariants(data.variants || []);
    } catch (err) { console.error(err); }
    setLoadingVariants(false);
  };

  const resetForm = () => {
    setForm({
      name: "", description: "", brand: "", category: "", price: "", mrp: "",
      partNumber: "", oemPartNumber: "", stock: "", lowStockThreshold: "5",
      warranty: "", weight: "", tags: "", originCountry: "",
    });
    setEditingProduct(null);
    setImageFiles([]);
    setImagePreviews([]);
    setCompatType("universal");
    setCompatVehicleType("");
    setCompatEntries([]);
    setModels([]);
    setVariants([]);
  };

  const handleOpenForm = async (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        name: product.name || "",
        description: product.description || "",
        brand: product.brand || "",
        category: product.category?._id || "",
        price: String(product.price || ""),
        mrp: String(product.mrp || ""),
        partNumber: product.partNumber || "",
        oemPartNumber: product.oemPartNumber || "",
        stock: String(product.stock || ""),
        lowStockThreshold: String(product.lowStockThreshold || 5),
        warranty: product.warranty || "",
        weight: String(product.weight || ""),
        tags: (product.tags || []).join(", "),
        originCountry: product.originCountry || "",
      });

      try {
        const compatData = await api.getSellerProductCompatibility(product._id);
        const compat = compatData.compatibility || [];
        if (compat.length === 0 || (compat.length === 1 && compat[0].isUniversal)) {
          setCompatType("universal");
        } else if (compat.length === 1 && !compat[0].brand && !compat[0].vehicleModel) {
          setCompatType("vehicleType");
          setCompatVehicleType(compat[0].vehicleType);
        } else {
          setCompatType("specific");
          setCompatEntries(compat.map((c: any) => ({
            vehicleType: c.vehicleType || "car",
            brand: c.brand?._id || "",
            brandName: c.brand?.name || "",
            vehicleModel: c.vehicleModel?._id || "",
            modelName: c.vehicleModel?.name || "",
            variant: c.variant?._id || "",
            variantName: c.variant?.name || "",
            yearFrom: String(c.yearFrom || ""),
            yearTo: String(c.yearTo || ""),
            notes: c.notes || "",
          })));
        }
      } catch {
        setCompatType("universal");
      }
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleBrandChange = async (entryIndex: number, brandId: string) => {
    const brand = brands.find((b: any) => b._id === brandId);
    const updated = [...compatEntries];
    updated[entryIndex] = {
      ...updated[entryIndex],
      brand: brandId,
      brandName: brand?.name || "",
      vehicleModel: "",
      modelName: "",
      variant: "",
      variantName: "",
    };
    setCompatEntries(updated);
    setModels([]);
    setVariants([]);
    if (brandId) await loadModels(brandId);
  };

  const handleModelChange = async (entryIndex: number, modelId: string) => {
    const model = models.find((m: any) => m._id === modelId);
    const updated = [...compatEntries];
    updated[entryIndex] = {
      ...updated[entryIndex],
      vehicleModel: modelId,
      modelName: model?.name || "",
      variant: "",
      variantName: "",
    };
    setCompatEntries(updated);
    setVariants([]);
    if (modelId) await loadVariants(modelId);
  };

  const handleVariantChange = (entryIndex: number, variantId: string) => {
    const variant = variants.find((v: any) => v._id === variantId);
    const updated = [...compatEntries];
    updated[entryIndex] = {
      ...updated[entryIndex],
      variant: variantId,
      variantName: variant?.name || "",
    };
    setCompatEntries(updated);
  };

  const addCompatEntry = () => {
    setCompatEntries([...compatEntries, {
      vehicleType: "car", brand: "", brandName: "", vehicleModel: "", modelName: "",
      variant: "", variantName: "", yearFrom: "", yearTo: "", notes: "",
    }]);
  };

  const removeCompatEntry = (index: number) => {
    setCompatEntries(compatEntries.filter((_, i) => i !== index));
  };

  const updateCompatEntry = (index: number, field: keyof CompatibilityEntry, value: string) => {
    const updated = [...compatEntries];
    updated[index] = { ...updated[index], [field]: value };
    setCompatEntries(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        price: Number(form.price),
        mrp: Number(form.mrp),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold),
        weight: form.weight ? Number(form.weight) : undefined,
        tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      };

      let productId: string;
      if (editingProduct) {
        await api.updateSellerProduct(editingProduct._id, payload);
        productId = editingProduct._id;
        toast.success("Product updated");
      } else {
        const data = await api.createSellerProduct(payload);
        productId = data.product?._id;
        toast.success("Product created! Awaiting approval.");
      }

      if (imageFiles.length > 0 && productId) {
        const fd = new FormData();
        imageFiles.forEach((f) => fd.append("images", f));
        await api.uploadSellerProductImages(productId, fd);
        toast.success("Images uploaded");
      }

      const compatPayload: any = { compatibilityType: compatType };
      if (compatType === "vehicleType") {
        compatPayload.vehicleType = compatVehicleType;
      } else if (compatType === "specific") {
        compatPayload.compatibility = compatEntries.map((e) => ({
          vehicleType: e.vehicleType,
          brand: e.brand || undefined,
          vehicleModel: e.vehicleModel || undefined,
          variant: e.variant || undefined,
          yearFrom: e.yearFrom ? Number(e.yearFrom) : undefined,
          yearTo: e.yearTo ? Number(e.yearTo) : undefined,
          notes: e.notes || undefined,
        }));
      }
      await api.updateSellerProductCompatibility(productId, compatPayload);

      setShowForm(false);
      resetForm();
      loadProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this product?")) return;
    try {
      await api.deleteSellerProduct(id);
      toast.success("Product deactivated");
      loadProducts();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleSellerProduct(id);
      toast.success("Product status toggled");
      loadProducts();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files].slice(0, 8));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteImage = async (productId: string, imageIndex: number) => {
    if (!confirm("Remove this image?")) return;
    try {
      await api.deleteSellerProductImage(productId, imageIndex);
      toast.success("Image removed");
      loadProducts();
    } catch (err: any) { toast.error(err.message); }
  };

  const getCompatLabel = (product: any) => {
    if (!product._compat) return null;
    const c = product._compat;
    if (c.some((x: any) => x.isUniversal)) return "Universal";
    if (c.length === 1 && !c[0].brand && !c[0].vehicleModel) return c[0].vehicleType;
    const parts = c.map((x: any) => {
      const bits = [x.brand?.name, x.vehicleModel?.name, x.variant?.name].filter(Boolean);
      return bits.join(" ") || x.vehicleType;
    });
    return parts.length > 2 ? `${parts[0]} +${parts.length - 1} more` : parts.join(", ");
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm">Manage your product catalog</p>
        </div>
        <Button onClick={() => handleOpenForm()}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="animate-pulse space-y-3"><div className="h-32 bg-gray-200 rounded" /><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-4 bg-gray-200 rounded w-1/2" /></div></CardContent></Card>
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <Card key={p._id} className="overflow-hidden">
                <div className="relative h-40 bg-gray-50">
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant={p.isApproved ? "default" : "secondary"} className="text-xs">
                      {p.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={p.isActive ? "outline" : "destructive"} className="text-xs">
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-1 mb-1">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mb-1">{p.brand} • {p.category?.name || "N/A"}</p>
                  {p._compat && p._compat.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {p._compat.some((c: any) => c.isUniversal) ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><Globe className="h-2.5 w-2.5 mr-0.5" /> Universal</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0"><Car className="h-2.5 w-2.5 mr-0.5" /> {getCompatLabel(p)}</Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold">{formatPrice(p.price)}</span>
                      {p.mrp > p.price && (
                        <span className="text-xs text-muted-foreground line-through ml-2">{formatPrice(p.mrp)}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                  </div>
                  {p.images && p.images.length > 0 && (
                    <div className="flex gap-1 mb-3">
                      {p.images.slice(0, 4).map((img: any, i: number) => (
                        <div key={i} className="relative w-10 h-10 rounded border overflow-hidden group">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeleteImage(p._id, i)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {p.images.length > 4 && (
                        <div className="w-10 h-10 rounded border flex items-center justify-center text-xs text-muted-foreground">
                          +{p.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenForm(p)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleToggle(p._id)}>
                      {p.isActive ? "Off" : "On"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(p._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No products found. Add your first product!</p>
        </CardContent></Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Product Images</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded border overflow-hidden">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
                {imageFiles.length < 8 && (
                  <label className="w-20 h-20 rounded border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Max 8 images. JPG, PNG, WebP.</p>
            </div>

            <div><Label>Product Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description *</Label><Textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Brand *</Label><Input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Selling Price (₹) *</Label><Input type="number" required min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>MRP (₹) *</Label><Input type="number" required min="0" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Part Number</Label><Input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} /></div>
              <div><Label>OEM Part Number</Label><Input value={form.oemPartNumber} onChange={(e) => setForm({ ...form, oemPartNumber: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Stock *</Label><Input type="number" required min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              <div><Label>Low Stock Alert</Label><Input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></div>
              <div><Label>Weight (kg)</Label><Input type="number" min="0" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Warranty</Label><Input value={form.warranty} placeholder="e.g. 6 months" onChange={(e) => setForm({ ...form, warranty: e.target.value })} /></div>
              <div><Label>Origin Country</Label><Input value={form.originCountry} placeholder="e.g. India" onChange={(e) => setForm({ ...form, originCountry: e.target.value })} /></div>
            </div>
            <div><Label>Tags</Label><Input value={form.tags} placeholder="comma separated tags" onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>

            <Separator />
            <div>
              <Label className="text-base font-semibold">Vehicle Compatibility</Label>
              <p className="text-xs text-muted-foreground mb-3">Define which vehicles this product fits. Leave as Universal if it fits all.</p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <button type="button" onClick={() => setCompatType("universal")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${compatType === "universal" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
                  <Globe className="h-5 w-5 mb-1 text-primary" />
                  <p className="text-sm font-medium">Universal</p>
                  <p className="text-[10px] text-muted-foreground">Fits all vehicles</p>
                </button>
                <button type="button" onClick={() => setCompatType("vehicleType")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${compatType === "vehicleType" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
                  <Car className="h-5 w-5 mb-1 text-primary" />
                  <p className="text-sm font-medium">Vehicle Type</p>
                  <p className="text-[10px] text-muted-foreground">All cars, bikes, etc.</p>
                </button>
                <button type="button" onClick={() => setCompatType("specific")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${compatType === "specific" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}>
                  <CircleDot className="h-5 w-5 mb-1 text-primary" />
                  <p className="text-sm font-medium">Specific</p>
                  <p className="text-[10px] text-muted-foreground">Exact model fitment</p>
                </button>
              </div>

              {compatType === "vehicleType" && (
                <div className="max-w-xs">
                  <Label>Select Vehicle Type</Label>
                  <Select value={compatVehicleType} onValueChange={setCompatVehicleType}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((vt) => (
                        <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {compatType === "specific" && (
                <div className="space-y-3">
                  {compatEntries.map((entry, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Vehicle {idx + 1}</p>
                        <button type="button" onClick={() => removeCompatEntry(idx)} className="text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Vehicle Type</Label>
                          <Select value={entry.vehicleType} onValueChange={(v) => updateCompatEntry(idx, "vehicleType", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VEHICLE_TYPES.map((vt) => (
                                <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Brand</Label>
                          <Select value={entry.brand} onValueChange={(v) => handleBrandChange(idx, v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any brand" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Any Brand</SelectItem>
                              {brands.filter((b: any) => !entry.vehicleType || b.vehicleType?.includes(entry.vehicleType)).map((b: any) => (
                                <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {entry.brand && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Model</Label>
                            <Select value={entry.vehicleModel} onValueChange={(v) => handleModelChange(idx, v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={loadingModels ? "Loading..." : "Any model"} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Any Model</SelectItem>
                                {models.map((m: any) => (
                                  <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {entry.vehicleModel && (
                            <div>
                              <Label className="text-xs">Variant</Label>
                              <Select value={entry.variant} onValueChange={(v) => handleVariantChange(idx, v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={loadingVariants ? "Loading..." : "Any variant"} /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">Any Variant</SelectItem>
                                  {variants.map((v: any) => (
                                    <SelectItem key={v._id} value={v._id}>{v.name} ({v.yearFrom}-{v.yearTo || "present"})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Year From</Label>
                          <Input type="number" className="h-8 text-xs" placeholder="e.g. 2015" value={entry.yearFrom} onChange={(e) => updateCompatEntry(idx, "yearFrom", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Year To</Label>
                          <Input type="number" className="h-8 text-xs" placeholder="e.g. 2023" value={entry.yearTo} onChange={(e) => updateCompatEntry(idx, "yearTo", e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Notes</Label>
                        <Input className="h-8 text-xs" placeholder="e.g. petrol variants only" value={entry.notes} onChange={(e) => updateCompatEntry(idx, "notes", e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addCompatEntry}>
                    <Plus className="h-3 w-3 mr-1" /> Add Another Vehicle
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
