"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function SellerNotifications() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadNotifications();
  }, [user, router, page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerNotifications({ page: String(page), limit: "15" });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setPagination(data.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markSellerNotificationRead(id);
      loadNotifications();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllSellerNotificationsRead();
      toast.success("All notifications marked as read");
      loadNotifications();
    } catch (err: any) { toast.error(err.message); }
  };

  const getTypeBorder = (type: string) => {
    switch (type) {
      case "success": return "border-l-success";
      case "error": return "border-l-destructive";
      case "warning": return "border-l-warning";
      default: return "border-l-muted-foreground";
    }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="vp-main space-y-5 fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead} className="rounded-lg w-full sm:w-auto"><CheckCheck className="h-4 w-4 mr-2" /> Mark All Read</Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="rounded-lg border border-border bg-card p-4"><div className="h-12 animate-pulse rounded bg-muted" /></div>)}
        </div>
      ) : notifications.length > 0 ? (
        <>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n._id} className={`rounded-lg border border-border border-l-4 p-4 ${n.isRead ? "bg-card" : "bg-muted/40"} ${getTypeBorder(n.type)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm break-words ${n.isRead ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 break-words">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <Button size="icon-sm" variant="ghost" aria-label="Mark as read" onClick={() => handleMarkRead(n._id)} className="min-h-10 min-w-10 shrink-0 text-muted-foreground hover:text-foreground">
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="min-h-10 min-w-10" disabled={!pagination.hasPrevPage} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /><span className="sr-only">Previous page</span></Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
              <Button variant="outline" size="sm" className="min-h-10 min-w-10" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /><span className="sr-only">Next page</span></Button>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No notifications</h2>
          <p className="text-sm text-muted-foreground">You&apos;re all caught up!</p>
        </div>
      )}
    </div>
  );
}
