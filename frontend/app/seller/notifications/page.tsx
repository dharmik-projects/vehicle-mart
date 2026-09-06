"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

export default function SellerNotifications() {
  const router = useRouter();
  const { user } = useAuthStore();
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-50 border-l-4 border-green-500";
      case "error": return "bg-red-50 border-l-4 border-red-500";
      case "warning": return "bg-yellow-50 border-l-4 border-yellow-500";
      default: return "bg-blue-50 border-l-4 border-blue-500";
    }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}><CheckCheck className="h-4 w-4 mr-2" /> Mark All Read</Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="animate-pulse h-12 bg-gray-200 rounded" /></CardContent></Card>)}
        </div>
      ) : notifications.length > 0 ? (
        <>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n._id} className={`p-4 rounded-lg ${n.isRead ? "bg-white border" : getTypeColor(n.type)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm ${n.isRead ? "font-medium" : "font-semibold"}`}>{n.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <Button size="sm" variant="ghost" onClick={() => handleMarkRead(n._id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
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
          <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No notifications yet.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
