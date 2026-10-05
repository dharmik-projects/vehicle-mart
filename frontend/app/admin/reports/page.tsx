"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, DollarSign, ShoppingCart, Store, Boxes, Users } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart";
import { BarList } from "@/components/charts/BarList";
import { DonutChart } from "@/components/charts/DonutChart";
import { statusColor } from "@/components/charts/statusColors";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fill the whole period with real calendar days (missing days = real zero days). */
function buildSeries(rows: any[], days: number, pick: (row: any) => number, fmt: (n: number) => string): TrendPoint[] {
  const byDate = new Map<string, any>();
  for (const row of rows || []) byDate.set(row._id, row);
  const points: TrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = byDate.get(key);
    const value = row ? pick(row) : 0;
    points.push({ label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, value, tip: fmt(value) });
  }
  return points;
}

/**
 * Platform Reports — real platform-wide analytics
 * (GET /api/admin/reports, admin-only aggregation over MongoDB).
 */
export default function AdminReports() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    loadReport();
  }, [user, router, period]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminReports(period);
      setReport(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (!user || user.role !== "admin") return null;

  const days = Math.min(Math.max(parseInt(period, 10) || 30, 1), 365);
  const salesByDay: any[] = report?.salesByDay || [];

  // Period totals derived from the real daily aggregation.
  const periodRevenue = salesByDay.reduce((s, d) => s + (Number(d.revenue) || 0), 0);
  const periodOrders = salesByDay.reduce((s, d) => s + (Number(d.orders) || 0), 0);
  const periodUnits = salesByDay.reduce((s, d) => s + (Number(d.units) || 0), 0);
  const avgOrderValue = periodOrders > 0 ? Math.round(periodRevenue / periodOrders) : 0;

  const revenuePoints = buildSeries(salesByDay, days, (r) => Number(r.revenue) || 0, (n) => formatPrice(n));
  const orderPoints = buildSeries(salesByDay, days, (r) => Number(r.orders) || 0, (n) => `${n} order${n === 1 ? "" : "s"}`);
  const userPoints: TrendPoint[] = (report?.usersByMonth || []).map((m: any) => ({
    label: `${MONTHS[(m._id?.month || 1) - 1]} ${m._id?.year || ""}`.trim(),
    value: Number(m.users) || 0,
    tip: `${m.users} new user${m.users === 1 ? "" : "s"}`,
  }));

  const kpis = [
    { label: `Revenue (last ${days} days)`, value: formatPrice(periodRevenue), icon: DollarSign },
    { label: `Orders (last ${days} days)`, value: periodOrders, icon: ShoppingCart },
    { label: "Avg Order Value", value: formatPrice(avgOrderValue), icon: BarChart3 },
    { label: "Total Users", value: report?.summary?.totalUsers ?? 0, icon: Users },
    { label: "Sellers", value: report?.summary?.totalSellers ?? 0, icon: Store },
    { label: "Active Products", value: report?.summary?.activeProducts ?? 0, icon: Boxes },
  ];

  const statusSegments = (report?.ordersByStatus || []).map((s: any) => ({
    label: s._id,
    value: Number(s.count) || 0,
    color: statusColor(s._id),
  }));
  const statusTotal = statusSegments.reduce((sum: number, s: any) => sum + s.value, 0);

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Platform-wide performance, from real order and user data</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full min-h-11 sm:w-[150px] sm:h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-56 rounded-lg" />
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((k) => (
              <div key={k.label} className="bg-card border border-border rounded-lg p-3 sm:p-4 min-w-0">
                <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center mb-2">
                  <k.icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{k.label}</p>
                <p className="text-lg sm:text-xl font-semibold text-foreground leading-tight break-words tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Trend</h3>
              <TrendChart points={revenuePoints} valueFormat={formatPrice} height={200} />
            </div>
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Order Trend</h3>
              <TrendChart points={orderPoints} valueFormat={(n) => `${n}`} height={200} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 min-w-0">
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
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Top Categories</h3>
              <BarList
                items={(report.topCategories || []).map((c: any) => ({
                  label: c._id || "Uncategorized",
                  value: Number(c.revenue) || 0,
                  sub: `${c.units} unit${c.units === 1 ? "" : "s"}`,
                }))}
                valueFormat={formatPrice}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Seller Performance</h3>
              <BarList
                items={(report.topSellers || []).map((s: any) => ({
                  label: s.name || "Seller",
                  value: Number(s.revenue) || 0,
                  sub: `${s.units} unit${s.units === 1 ? "" : "s"}`,
                }))}
                valueFormat={formatPrice}
              />
            </div>
            <div className="bg-card rounded-lg border border-border p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-3">Orders by Status</h3>
              <DonutChart
                segments={statusSegments}
                centerValue={String(statusTotal)}
                centerLabel="orders"
              />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">User Growth (last 6 months)</h3>
            <TrendChart points={userPoints} valueFormat={(n) => `${n} user${n === 1 ? "" : "s"}`} height={180} />
          </div>
        </>
      ) : (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No report data</h2>
          <p className="text-sm text-muted-foreground">Platform analytics will appear here once there is activity</p>
          <Button variant="outline" className="mt-4 rounded-lg" onClick={loadReport}>Retry</Button>
        </div>
      )}
    </div>
  );
}
