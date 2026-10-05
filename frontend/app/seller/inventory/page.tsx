"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Boxes, Package, PackagePlus, Wallet } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

/**
 * Seller inventory — stock levels of THIS seller's products only
 * (GET /api/seller/products, scoped to the authenticated seller).
 */
export default function SellerInventory() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState<any[]>([]);
  const [overview, setOverview] = useState<any[]>([]);
  const [lowTotal, setLowTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [editingStock, setEditingStock] = useState<any>(null);
  const [stockValue, setStockValue] = useState("");

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadInventory();
  }, [user, router, page, lowStockOnly]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "20" };
      if (lowStockOnly) params.status = "low-stock";
      // Page data + overview (up to 100 products, matching the API cap) + exact low-stock count.
      const [data, over, low] = await Promise.all([
        api.getSellerProducts(params),
        api.getSellerProducts({ limit: "100" }),
        api.getSellerProducts({ status: "low-stock", limit: "1" }),
      ]);
      setProducts(data.products || []);
      setPagination(data.pagination);
      setOverview(over.products || []);
      setLowTotal(low.pagination?.total || 0);
    } catch (err: any) { console.error(err); }
    setLoading(false);
  };

  const handleUpdateStock = async () => {
    if (!editingStock) return;
    try {
      await api.updateSellerProductStock(editingStock._id, Number(stockValue));
      toast.success("Stock updated");
      setEditingStock(null);
      loadInventory();
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  // Real totals derived from this seller's products (overview = up to 100 items, API cap).
  const totalUnits = overview.reduce((sum, p) => sum + (p.stock || 0), 0);
  const stockValueTotal = overview.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} products tracked</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button size="sm" variant={lowStockOnly ? "default" : "outline"} onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }} className="rounded-lg w-full sm:w-auto min-h-10">
            <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock Only
          </Button>
          <Link href="/seller/products" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="rounded-lg w-full sm:w-auto min-h-10">
              <Package className="h-3 w-3 mr-1" /> Manage Products
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      ) : (
        <>
          {/* Overview chips (derived from real data — never hardcoded) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="vp-stat">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5 shrink-0"><Boxes className="h-5 w-5 text-foreground" /></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-muted-foreground">Products</p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">{pagination?.total || 0}</p>
                </div>
              </div>
            </div>
            <div className="vp-stat">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5 shrink-0"><AlertTriangle className="h-5 w-5 text-foreground" /></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-muted-foreground">Low Stock</p>
                  <p className={`text-lg sm:text-xl font-bold tabular-nums ${lowTotal > 0 ? "text-destructive" : "text-foreground"}`}>{lowTotal}</p>
                </div>
              </div>
            </div>
            <div className="vp-stat">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5 shrink-0"><PackagePlus className="h-5 w-5 text-foreground" /></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-muted-foreground">Units in Stock</p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">{totalUnits}</p>
                </div>
              </div>
            </div>
            <div className="vp-stat">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5 shrink-0"><Wallet className="h-5 w-5 text-foreground" /></div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-muted-foreground">Stock Value</p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">{formatPrice(stockValueTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop (md+): table */}
          <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
            <div className="vp-table-scroll">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">SKU</th>
                    <th className="text-left py-3 px-4 font-medium">Category</th>
                    <th className="text-right py-3 px-4 font-medium">Price</th>
                    <th className="text-left py-3 px-4 font-medium">Stock</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id} className={`border-b border-border last:border-0 hover:bg-muted/40 ${p.stock <= 5 ? "bg-destructive/5" : ""}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-foreground truncate max-w-[220px]">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.brand || "—"}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{p.sku || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground truncate max-w-[160px]">{p.category?.name || "—"}</td>
                      <td className="py-3 px-4 text-right font-medium text-foreground tabular-nums">{formatPrice(p.price || 0)}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${p.stock <= 5 ? "text-destructive" : p.stock <= 10 ? "text-warning" : "text-foreground"}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={p.stock <= 5 ? "destructive" : p.stock <= 10 ? "warning" : "success"} className="text-xs">
                          {p.stock <= 5 ? "Low" : p.stock <= 10 ? "Medium" : "In stock"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="outline" onClick={() => { setEditingStock(p); setStockValue(String(p.stock)); }} className="rounded-lg">
                          Update Stock
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground bg-muted">
                        {lowStockOnly ? "No low-stock products." : "No products yet. Add your first product to track inventory."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: compact cards */}
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <div key={p._id} className={`bg-card rounded-lg border border-border p-4 space-y-3 ${p.stock <= 5 ? "border-l-4 border-l-destructive" : ""}`}>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.brand || "—"}</p>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground shrink-0">SKU</span>
                    <span className="font-mono text-xs text-muted-foreground truncate text-right min-w-0">{p.sku || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground shrink-0">Category</span>
                    <span className="text-foreground truncate text-right min-w-0">{p.category?.name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Price</span>
                    <span className="text-foreground font-medium tabular-nums">{formatPrice(p.price || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Stock</span>
                    <span className={`font-semibold ${p.stock <= 5 ? "text-destructive" : p.stock <= 10 ? "text-warning" : "text-foreground"}`}>
                      {p.stock}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setEditingStock(p); setStockValue(String(p.stock)); }} className="rounded-lg w-full min-h-10">
                  Update Stock
                </Button>
              </div>
            ))}
            {products.length === 0 && (
              <div className="text-center py-10 bg-card border border-border rounded-lg text-sm text-muted-foreground">
                {lowStockOnly ? "No low-stock products." : "No products yet. Add your first product to track inventory."}
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg min-h-10">Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg min-h-10">Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!editingStock} onOpenChange={() => setEditingStock(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Stock</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground break-words">{editingStock?.name}</p>
            <div>
              <Label className="text-xs">Stock Quantity</Label>
              <Input type="number" min="0" value={stockValue} onChange={(e) => setStockValue(e.target.value)} className="mt-1 h-11 sm:h-9" />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEditingStock(null)} className="rounded-lg min-h-11">Cancel</Button>
              <Button onClick={handleUpdateStock} className="rounded-lg min-h-11">Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
