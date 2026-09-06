"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, User, Save } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function SellerSettings() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} disabled /></div>
          </div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Account Info</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Role:</span><span className="capitalize">{user.role}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className="text-green-600">Active</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Member since:</span><span>{(user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString() : "N/A"}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
