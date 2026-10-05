"use client";
import { useState, useEffect } from "react";
import { Bell, Check, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const typeIcons: Record<string, any> = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };
/* Neutral cards with semantic left-border accents only (info → charcoal primary) */
const typeAccent: Record<string, string> = {
  info: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  error: "border-l-destructive",
};
const typeIconStyle: Record<string, string> = {
  info: "bg-muted text-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => { loadNotifications(); }, [page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminNotifications({ page: String(page), limit: "20" });
      setNotifications(data.notifications || []);
      setPagination(data.pagination);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    try { await api.markNotificationRead(id); loadNotifications(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">{pagination?.total || 0} total notifications</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {notifications.map((n) => {
          const Icon = typeIcons[n.type] || Info;
          return (
            <div
              key={n._id}
              className={`p-4 rounded-lg bg-card border border-border ${!n.isRead ? `border-l-4 ${typeAccent[n.type] || typeAccent.info}` : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${n.isRead ? "bg-muted text-foreground" : typeIconStyle[n.type] || typeIconStyle.info}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground break-words min-w-0">{n.title}</p>
                    {!n.isRead && <Badge variant="secondary" className="text-xs shrink-0">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 break-words">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                    {n.user && <span className="text-xs text-muted-foreground break-all">→ {n.user.name || n.user.email}</span>}
                  </div>
                </div>
                {!n.isRead && (
                  <Button size="sm" variant="ghost" onClick={() => handleMarkRead(n._id)} title="Mark as read" className="shrink-0 min-h-10 min-w-10 text-muted-foreground hover:text-foreground">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground mb-1">No notifications</h2>
            <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
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
    </div>
  );
}
