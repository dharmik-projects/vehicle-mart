"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, Eye, ChevronLeft, ChevronRight, Truck, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

const statusVariant = (status?: string) => {
  switch (status) {
    case "delivered":
    case "paid":
    case "active":
    case "approved":
      return "success" as const;
    case "pending":
    case "returned":
    case "refunded":
      return "warning" as const;
    case "cancelled":
    case "failed":
    case "rejected":
      return "destructive" as const;
    case "confirmed":
    case "processing":
    case "shipped":
    case "inactive":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

export default function SellerOrders() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null); // order whose status update is in flight
  const [busyAction, setBusyAction] = useState<string | null>(null); // the status being applied

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) {
      router.push("/login");
      return;
    }
    loadOrders();
  }, [user, router, page, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { page: String(page), limit: "15" };
      if (statusFilter !== "all") params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await api.getSellerOrders(params);
      setOrders(data.orders || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setBusyId(orderId); setBusyAction(status); // immediate feedback on this order only
    try {
      await api.updateSellerOrderStatus(orderId, { orderStatus: status });
      toast.success(`Order marked as ${status}`);
      loadOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null); setBusyAction(null);
    }
  };

  const viewOrder = async (order: any) => {
    try {
      const data = await api.getSellerOrder(order._id);
      setSelectedOrder(data.order);
      setShowDetail(true);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getNextStatuses = (current: string) => {
    const flow = ["pending", "confirmed", "processing", "shipped", "delivered"];
    const idx = flow.indexOf(current);
    if (idx === -1) return [];
    return flow.slice(idx + 1);
  };

  // This order's line items that belong to the logged-in seller (same filter the
  // detail dialog uses) — used for the compact "items" line on narrow screens.
  const sellerItems = (order: any) =>
    (order?.items || []).filter(
      (item: any) => item.seller === (user as any)?.id || item.seller?._id === (user as any)?.id
    );

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="vp-main space-y-6 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground text-sm">Manage and fulfill customer orders</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by order ID..." className="pl-9 h-11 w-full" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="animate-pulse space-y-2"><div className="h-4 bg-muted rounded w-1/3" /><div className="h-3 bg-muted rounded w-1/2" /></div></CardContent></Card>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order._id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">#{order._id.slice(-8).toUpperCase()}</p>
                        <Badge variant={statusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        {order.user?.name || "Customer"} • {order.user?.email || ""} • {formatDate(order.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        {order.shippingAddress?.city}, {order.shippingAddress?.state} • {order.shippingAddress?.pincode}
                      </p>
                      {sellerItems(order).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          Items: {sellerItems(order).map((item: any) => item.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-foreground tabular-nums">{formatPrice(order.total)}</p>
                        <Badge variant="outline" className="text-xs mt-1">{order.paymentStatus}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" className="min-h-10 min-w-10" aria-label="View order details" onClick={() => viewOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                    {getNextStatuses(order.orderStatus).map((s) => (
                      <Button key={s} size="sm" variant="outline" className="min-h-10" onClick={() => handleStatusUpdate(order._id, s)} disabled={busyId === order._id}>
                        {busyId === order._id && busyAction === s ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : s === "shipped" ? (
                          <Truck className="h-3 w-3 mr-1" />
                        ) : null}
                        Mark as {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="min-h-10 min-w-10" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" className="min-h-10 min-w-10" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card><CardContent className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">No orders found.</p>
        </CardContent></Card>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?._id?.slice(-8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-1.5"><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant(selectedOrder.orderStatus)}>{selectedOrder.orderStatus}</Badge></div>
                <div className="flex flex-wrap items-center gap-1.5"><span className="text-muted-foreground">Payment:</span> <Badge variant="outline">{selectedOrder.paymentStatus}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {formatDate(selectedOrder.createdAt)}</div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold tabular-nums">{formatPrice(selectedOrder.total)}</span></div>
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1 text-foreground">Customer</p>
                <p className="text-muted-foreground break-words">{selectedOrder.user?.name} • {selectedOrder.user?.email}</p>
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1 text-foreground">Shipping Address</p>
                <p className="text-muted-foreground break-words">
                  {selectedOrder.shippingAddress?.fullName}<br />
                  {selectedOrder.shippingAddress?.addressLine1}<br />
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                </p>
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1 text-foreground">Items</p>
                    {selectedOrder.items?.filter((item: any) => item.seller === (user as any)?.id || item.seller?._id === (user as any)?.id).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-10 h-10 bg-muted rounded overflow-hidden shrink-0">
                      {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">📦</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground tabular-nums shrink-0">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
