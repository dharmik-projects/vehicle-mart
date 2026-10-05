"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Boxes, Download, Package, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { BarList } from "@/components/charts/BarList";
import toast from "react-hot-toast";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fill the whole period with real days (missing days = real zero-sales days). */
function buildSeries(salesByDay: any[], days: number): TrendPoint[] {
  const byDate = new Map<string, any>();
  for (const row of salesByDay || []) byDate.set(row._id, row);

  const points: TrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = byDate.get(key);
    const label = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    points.push({
      label,
      value: row ? Number(row.revenue) || 0 : 0,
      tip: row ? `${formatPrice(row.revenue)} · ${row.orders} order${row.orders === 1 ? "" : "s"} · ${row.units} units` : `${formatPrice(0)} · 0 orders`,
    });
  }
  return points;
}

function buildOrderSeries(salesByDay: any[], days: number): TrendPoint[] {
  const byDate = new Map<string, any>();
  for (const row of salesByDay || []) byDate.set(row._id, row);
  const points: TrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = byDate.get(key);
    const orders = row ? Number(row.orders) || 0 : 0;
    points.push({
      label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      value: orders,
      tip: `${orders} order${orders === 1 ? "" : "s"}`,
    });
  }
  return points;
}

/**
 * Sales Reports — real analytics for THIS seller only
 * (GET /api/seller/reports/sales, scoped to the authenticated seller).
 */
export default function SellerReports() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [report, setReport] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadReport();
  }, [user, router, period]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const [data, products] = await Promise.all([
        api.getSellerSalesReport(period),
        api.getSellerProducts({ limit: "100" }),
      ]);
      setReport(data);
      setInventory(products.products || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleExport = () => {
    if (!report?.salesByDay?.length) { toast.error("No data to export yet"); return; }
    const csv = [["Date", "Revenue", "Orders", "Units"], ...report.salesByDay.map((d: any) => [d._id, d.revenue, d.orders, d.units])];
    const blob = new Blob([csv.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sales-report-${period}days.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  const days = Math.min(Math.max(parseInt(period, 10) || 30, 1), 365);
  const salesByDay: any[] = report?.salesByDay || [];

  // Totals derived from the real daily rows (zero when there are no sales).
  const totalRevenue = salesByDay.reduce((s, d) => s + (Number(d.revenue) || 0), 0);
  const totalOrders = salesByDay.reduce((s, d) => s + (Number(d.orders) || 0), 0);
  const totalUnits = salesByDay.reduce((s, d) => s + (Number(d.units) || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const revenuePoints = buildSeries(salesByDay, days);
  const orderPoints = buildOrderSeries(salesByDay, days);

  // Inventory overview (this seller's real stock).
  const lowStockItems = inventory.filter((p) => p.stock <= 5).sort((a, b) => a.stock - b.stock);
  const unitsInStock = inventory.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  const stockValue = inventory.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);

  const kpis = [
    { label: "Revenue", value: formatPrice(totalRevenue), icon: Wallet },
    { label: "Orders", value: totalOrders, icon: ShoppingCart },
    { label: "Units Sold", value: totalUnits, icon: TrendingUp },
    { label: "Avg Order Value", value: formatPrice(avgOrderValue), icon: BarChart3 },
  ];

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-sm text-muted-foreground">Analyze your sales performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full min-h-11 sm:w-[150px] sm:h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} className="w-full min-h-11 rounded-lg sm:w-auto"><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-4 sm:p-8"><div className="animate-pulse space-y-3"><div className="h-4 bg-muted rounded w-1/3" /><div className="h-40 bg-muted rounded" /></div></div>
      ) : report ? (
        <>
          {/* KPI cards — derived from the real daily aggregation */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="vp-stat">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2.5 shrink-0"><k.icon className="h-5 w-5 text-foreground" /></div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] text-muted-foreground">{k.label}</p>
                    <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">{k.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trends (line charts over the selected period) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="rounded-lg border border-border bg-card p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Trend</h3>
              <TrendChart points={revenuePoints} valueFormat={formatPrice} height={200} />
            </div>
            <div className="rounded-lg border border-border bg-card p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Order Trend</h3>
              <TrendChart points={orderPoints} valueFormat={(n) => `${n}`} height={200} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Top Products */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top Products</h3>
              <BarList
                items={(report.topProducts || []).map((p: any) => ({
                  label: p.name || "Product",
                  value: Number(p.revenue) || 0,
                  sub: `${p.units} unit${p.units === 1 ? "" : "s"}`,
                }))}
                valueFormat={formatPrice}
              />
            </div>

            {/* Sales by Category */}
            <div className="rounded-lg border border-border bg-card p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Sales by Category</h3>
              <BarList
                items={(report.salesByCategory || []).map((c: any) => ({
                  label: c._id || "Uncategorized",
                  value: Number(c.revenue) || 0,
                  sub: `${c.units} unit${c.units === 1 ? "" : "s"}`,
                }))}
                valueFormat={formatPrice}
              />
            </div>
          </div>

          {/* Inventory overview */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Inventory Overview</h3>
              <Link href="/seller/inventory" className="flex min-h-9 items-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium">
                View Inventory
              </Link>
            </div>
            {inventory.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border min-w-0">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Products</p>
                      <p className="text-base sm:text-lg font-bold tabular-nums text-foreground">{inventory.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border min-w-0">
                    <Boxes className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Units in Stock</p>
                      <p className="text-base sm:text-lg font-bold tabular-nums text-foreground">{unitsInStock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border col-span-2 sm:col-span-1 min-w-0">
                    <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Stock Value</p>
                      <p className="text-base sm:text-lg font-bold tabular-nums text-foreground">{formatPrice(stockValue)}</p>
                    </div>
                  </div>
                </div>

                {lowStockItems.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Low Stock (≤ 5 units)</p>
                    <div className="space-y-2">
                      {lowStockItems.slice(0, 5).map((p) => (
                        <div key={p._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className={`text-sm font-bold tabular-nums shrink-0 ${p.stock <= 5 ? "text-destructive" : "text-foreground"}`}>{p.stock} left</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center">
                    <p className="text-sm text-muted-foreground">All products are well-stocked.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No products yet. Add products to see inventory here.</p>
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
          <p className="text-sm text-muted-foreground">Sales data will appear here once you make sales</p>
        </div>
      )}
    </div>
  );
}
