"use client";
import { useState, useEffect } from "react";
import { Shield, User, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") { router.push("/login"); return; }
    setForm({ name: user.name || "", email: user.email || "", phone: "" });
  }, [user, router]);

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const data = await api.updateProfile({ name: form.name, phone: form.phone });
      setUser({ ...user!, name: data.user.name, phone: data.user.phone });
      toast.success("Profile updated");
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Passwords don't match"); return; }
    if (passwordForm.newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      await api.updatePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success("Password changed");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="vp-main">
    <div className="space-y-5 fade-in max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your admin account</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-muted text-foreground rounded-lg flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Profile</h3>
        </div>
        <div className="space-y-3">
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
          <div><Label className="text-xs">Email</Label><Input value={form.email} disabled className="mt-1 h-11 sm:h-9 bg-muted" /></div>
          <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Your phone number" className="mt-1 h-11 sm:h-9" /></div>
          <Button onClick={handleUpdateProfile} disabled={saving} className="rounded-lg w-full sm:w-auto min-h-11">
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-muted text-foreground rounded-lg flex items-center justify-center">
            <Shield className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
        </div>
        <div className="space-y-3">
          <div><Label className="text-xs">Current Password</Label><Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
          <div><Label className="text-xs">New Password</Label><Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
          <div><Label className="text-xs">Confirm New Password</Label><Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="mt-1 h-11 sm:h-9" /></div>
          <Button onClick={handleChangePassword} disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword} className="rounded-lg w-full sm:w-auto min-h-11">
            Change Password
          </Button>
        </div>
      </div>
    </div>
    </div>
  );
}
