"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

export default function SellerReports() {
  const router = useRouter();
  const { user } = useAuthStore();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Reports</h1>
          <p className="text-muted-foreground text-sm">Analyze your sales performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8"><div className="animate-pulse space-y-3"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-40 bg-gray-200 rounded" /></div></CardContent></Card>
      ) : report ? (
        <>
          {report.salesByDay && report.salesByDay.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Sales by Day</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-48">
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
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {report.salesByCategory && report.salesByCategory.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Sales by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.salesByCategory.map((c: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border">
                        <p className="text-sm font-medium">{c._id}</p>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatPrice(c.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{c.units} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {report.topProducts && report.topProducts.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Top Products</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.topProducts.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border">
                        <p className="text-sm font-medium">{p.name || "Product"}</p>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatPrice(p.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{p.units} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No report data available.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
