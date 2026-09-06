"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [editingStock, setEditingStock] = useState<any>(null);
  const [stockValue, setStockValue] = useState("");

  useEffect(() => { loadInventory(); }, [page, lowStockOnly]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "20" };
      if (lowStockOnly) params.lowStock = "true";
      const data = await api.getAdminInventory(params);
      setProducts(data.products || []);
      setPagination(data.pagination);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleUpdateStock = async () => {
    if (!editingStock) return;
    try {
      await api.updateProductStock(editingStock._id, Number(stockValue));
      toast.success("Stock updated");
      setEditingStock(null);
      loadInventory();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6" /> Inventory Monitoring</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{pagination?.total || 0} products</Badge>
          <Button size="sm" variant={lowStockOnly ? "default" : "outline"} onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}>
            <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock Only
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium">Product</th>
                  <th className="text-left py-3 px-4 font-medium">SKU</th>
                  <th className="text-left py-3 px-4 font-medium">Category</th>
                  <th className="text-left py-3 px-4 font-medium">Seller</th>
                  <th className="text-left py-3 px-4 font-medium">Stock</th>
                  <th className="text-left py-3 px-4 font-medium">Threshold</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className={`border-b last:border-0 hover:bg-gray-50 ${p.stock <= 5 ? "bg-red-50" : ""}`}>
                    <td className="py-3 px-4">
                      <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{p.sku}</td>
                    <td className="py-3 px-4 text-muted-foreground">{p.category?.name || "—"}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{p.seller?.sellerInfo?.businessName || p.seller?.name || "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${p.stock <= 5 ? "text-red-600" : p.stock <= 10 ? "text-orange-500" : ""}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{p.lowStockThreshold || 5}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => { setEditingStock(p); setStockValue(String(p.stock)); }}>
                        Update Stock
                      </Button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No products found</td></tr>
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

      <Dialog open={!!editingStock} onOpenChange={() => setEditingStock(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Stock</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">{editingStock?.name}</p>
            <div>
              <Label>Stock Quantity</Label>
              <Input type="number" min="0" value={stockValue} onChange={(e) => setStockValue(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingStock(null)}>Cancel</Button>
              <Button onClick={handleUpdateStock}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
