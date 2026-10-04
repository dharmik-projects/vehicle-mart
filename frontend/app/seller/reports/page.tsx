"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function SellerReports() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadReport();
  }, [user, router, period]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerSalesReport(period);
      setReport(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleExport = () => {
    if (!report?.salesByDay) return;
    const csv = [["Date", "Revenue", "Orders", "Units"], ...report.salesByDay.map((d: any) => [d._id, d.revenue, d.orders, d.units])];
    const blob = new Blob([csv.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sales-report-${period}days.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-sm text-muted-foreground">Analyze your sales performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className="rounded-lg"><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8"><div className="animate-pulse space-y-3"><div className="h-4 bg-muted rounded w-1/3" /><div className="h-40 bg-muted rounded" /></div></div>
      ) : report ? (
        <>
          {report.salesByDay && report.salesByDay.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Sales by Day</h3>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-48 min-w-[280px]">
                  {report.salesByDay.map((d: any, i: number) => {
                    const maxRev = Math.max(...report.salesByDay.map((s: any) => s.revenue));
                    const h = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d._id}: ${formatPrice(d.revenue)} (${d.orders} orders)`}>
                        <span className="text-[9px] text-muted-foreground hidden lg:block">{formatPrice(d.revenue)}</span>
                        <div className="w-full bg-primary rounded-t" style={{ height: `${Math.max(h, 2)}%` }} />
                        <span className="text-[9px] text-muted-foreground">{d._id.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {report.salesByCategory && report.salesByCategory.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Sales by Category</h3>
                <div className="space-y-2.5">
                  {report.salesByCategory.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border">
                      <p className="text-sm font-medium text-foreground truncate">{c._id}</p>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatPrice(c.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{c.units} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.topProducts && report.topProducts.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Top Products</h3>
                <div className="space-y-2.5">
                  {report.topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border">
                      <p className="text-sm font-medium text-foreground truncate">{p.name || "Product"}</p>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatPrice(p.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{p.units} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No report data</h2>
          <p className="text-sm text-muted-foreground">Sales data will appear here</p>
        </div>
      )}
    </div>
  );
}
