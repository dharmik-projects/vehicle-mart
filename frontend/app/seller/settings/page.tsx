"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Save } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function SellerSettings() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    setForm({ name: user.name || "", email: user.email || "", phone: (user as any).phone || "" });
    setLoading(false);
  }, [user, router]);

  const handleSave = async () => {
    try {
      const data = await api.updateProfile({ name: form.name, phone: form.phone });
      if (data.user) setUser(data.user);
      toast.success("Profile updated");
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-muted p-1.5">
            <User className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Profile</h3>
        </div>
        <div className="space-y-3 max-w-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-9" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email} disabled className="mt-1 h-9 bg-muted" /></div>
          </div>
          <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 h-9" /></div>
          <Button onClick={handleSave} className="rounded-lg"><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Account Info</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Role:</span><span className="font-medium text-foreground capitalize">{user.role}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className="text-success font-medium">Active</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Member since:</span><span className="text-foreground">{(user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString() : "N/A"}</span></div>
        </div>
      </div>
    </div>
  );
}
