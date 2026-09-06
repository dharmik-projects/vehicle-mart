"use client";
import { useState, useEffect } from "react";
import { Bell, Check, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const typeIcons: Record<string, any> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Notifications</h1>
        <Badge variant="outline">{pagination?.total || 0} total</Badge>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => {
          const Icon = typeIcons[n.type] || Info;
          return (
            <Card key={n._id} className={!n.isRead ? "border-l-4 border-l-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${typeColors[n.type] || typeColors.info}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.isRead && <Badge className="bg-primary/10 text-primary text-[10px]">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                      {n.user && <span className="text-xs text-muted-foreground">→ {n.user.name || n.user.email}</span>}
                    </div>
                  </div>
                  {!n.isRead && (
                    <Button size="sm" variant="ghost" onClick={() => handleMarkRead(n._id)} className="shrink-0">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {notifications.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No notifications</CardContent></Card>
        )}
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
    </div>
  );
}
