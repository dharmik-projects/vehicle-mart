"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Ban, CheckCircle, UserPlus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";

function statusBadgeVariant(status: string) {
  switch (status) {
    case "active":
    case "delivered":
    case "paid":
    case "confirmed":
      return "success";
    case "pending":
    case "processing":
    case "shipped":
    case "refunded":
      return "warning";
    case "cancelled":
    case "failed":
    case "returned":
      return "destructive";
    case "inactive":
      return "secondary";
    default:
      return "outline";
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); // responsive input value
  const [debouncedSearch, setDebouncedSearch] = useState(""); // what the fetch uses
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0); // stale-response guard
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, [page, roleFilter, debouncedSearch]);

  /* Debounced (300ms) search: typing stays instant, the fetch only runs when
     the user pauses — and the page resets to 1 with the new term. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const loadUsers = async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const params: any = { page: String(page), limit: "20" };
      if (roleFilter) params.role = roleFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await api.getAdminUsers(params);
      if (seq !== seqRef.current) return; // stale response — ignore out-of-order replies
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (err: any) {
      if (seq === seqRef.current) toast.error(err.message);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setBusyId(id); setBusyAction("status");
    try {
      if (currentActive) {
        await api.deleteAdminUser(id);
        toast.success("User deactivated");
      } else {
        await api.activateAdminUser(id);
        toast.success("User activated");
      }
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); setBusyAction(null); }
  };

  const handleChangeRole = async (id: string, newRole: string) => {
    setBusyId(id); setBusyAction("role");
    try {
      await api.updateAdminUser(id, { role: newRole });
      toast.success("Role updated");
      loadUsers();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusyId(null); setBusyAction(null); }
  };

  return (
    <div className="space-y-5 fade-in">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground">Users Management</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter || "__all"} onValueChange={(v) => { setRoleFilter(v === "__all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="seller">Seller</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Role</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Joined</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium text-foreground">{u.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <Select value={u.role} onValueChange={(v) => handleChangeRole(u._id, v)} disabled={busyId === u._id}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusBadgeVariant(u.isActive ? "active" : "inactive")}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant={u.isActive ? "destructive" : "default"}
                        onClick={() => handleToggleActive(u._id, u.isActive)}
                        disabled={busyId === u._id}
                      >
                        {busyId === u._id && busyAction === "status" ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : u.isActive ? (
                          <Ban className="h-3 w-3 mr-1" />
                        ) : (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-muted-foreground bg-muted">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {users.length} of {pagination.total} users</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
