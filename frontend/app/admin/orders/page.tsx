"use client";
import { useState, useEffect } from "react";
import { Search, Eye, ShoppingCart, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from "react-hot-toast";

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
const paymentStatuses = ["pending", "paid", "failed", "refunded"];

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // row whose status update is in flight

  useEffect(() => { loadOrders(); }, [page, statusFilter, paymentFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "20" };
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;
      const data = await api.getAdminOrders(params);
      setOrders(data.orders || []);
      setPagination(data.pagination);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setBusyId(orderId); // immediate feedback on the affected row only
    try {
      await api.updateAdminOrderStatus(orderId, { orderStatus: status });
      toast.success("Order status updated");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const viewOrder = async (id: string) => {
    try {
      const data = await api.getAdminOrder(id);
      setDetailOrder(data.order);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Orders Management</h1>
        <Badge variant="outline">{pagination?.total || 0} orders</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter || "__all"} onValueChange={(v) => { setStatusFilter(v === "__all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Status</SelectItem>
            {orderStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter || "__all"} onValueChange={(v) => { setPaymentFilter(v === "__all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Payment</SelectItem>
            {paymentStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Order ID</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Items</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                  <th className="text-left py-3 px-4 font-medium">Payment</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="py-3 px-4 font-mono text-xs">#{o._id.slice(-8).toUpperCase()}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{o.user?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.user?.email}</p>
                    </td>
                    <td className="py-3 px-4">{o.items?.length || 0}</td>
                    <td className="py-3 px-4 font-semibold">{formatPrice(o.total)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadgeVariant(o.paymentStatus)}>
                        {o.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Select value={o.orderStatus} onValueChange={(v) => handleStatusUpdate(o._id, v)} disabled={busyId === o._id}>
                          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {orderStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {busyId === o._id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => viewOrder(o._id)}><Eye className="h-4 w-4 text-muted-foreground" /></Button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-foreground bg-muted">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Order ID:</span> <span className="font-mono">#{detailOrder._id.slice(-8).toUpperCase()}</span></div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(detailOrder.createdAt)}</div>
                <div><span className="text-muted-foreground">Customer:</span> {detailOrder.user?.name}</div>
                <div><span className="text-muted-foreground">Phone:</span> {detailOrder.user?.phone || detailOrder.shippingAddress?.phone}</div>
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1">Shipping Address:</p>
                <p className="text-muted-foreground">{detailOrder.shippingAddress?.fullName}, {detailOrder.shippingAddress?.addressLine1}, {detailOrder.shippingAddress?.city}, {detailOrder.shippingAddress?.state} - {detailOrder.shippingAddress?.pincode}</p>
              </div>
              <div className="space-y-2">
                {detailOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span> {formatPrice(detailOrder.subtotal)}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping:</span> {formatPrice(detailOrder.shippingCost || 0)}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax:</span> {formatPrice(detailOrder.tax || 0)}</div>
                <div className="flex justify-between font-semibold text-base"><span>Total:</span> {formatPrice(detailOrder.total)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
