"use client";
import { useState, useEffect } from "react";
import { Shield, User, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
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
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
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
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Admin Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} disabled />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Your phone number" />
          </div>
          <Button onClick={handleUpdateProfile} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Current Password</Label>
            <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
          </div>
          <div>
            <Label>New Password</Label>
            <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
          </div>
          <Button onClick={handleChangePassword} disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword}>
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
