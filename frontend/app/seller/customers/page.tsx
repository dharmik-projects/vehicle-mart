"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, ChevronLeft, ChevronRight, Mail, Phone } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SellerCustomers() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadCustomers();
  }, [user, router, page]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerCustomers({ page: String(page), limit: "15" });
      setCustomers(data.customers || []);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-muted-foreground text-sm">Customers who purchased your products</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="animate-pulse flex gap-3"><div className="h-10 w-10 bg-gray-200 rounded-full" /><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div></CardContent></Card>)}
        </div>
      ) : customers.length > 0 ? (
        <>
          <div className="space-y-3">
            {customers.map((c) => (
              <Card key={c._id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">{c.user?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.user?.name || "Unknown"}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.user?.email}</span>
                        {c.user?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.user.phone}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatPrice(c.totalSpent)}</p>
                      <p className="text-xs text-muted-foreground">{c.totalOrders} order{c.totalOrders > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Last order: {formatDate(c.lastOrder)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No customer data yet.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
