"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Save, Store, User } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

/**
 * Seller settings — profile, business information and password.
 * (The separate Store page was merged in here.)
 */
export default function SellerSettings() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [bizForm, setBizForm] = useState({
    businessName: "", businessAddress: "", gstNumber: "", description: "",
  });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    setForm({ name: user.name || "", email: user.email || "", phone: (user as any).phone || "" });
    loadStore();
  }, [user, router]);

  const loadStore = async () => {
    try {
      const data = await api.getSellerStore();
      const s = data.store || {};
      setForm((f) => ({
        ...f,
        name: s.name || f.name,
        phone: s.phone || f.phone,
      }));
      setBizForm({
        businessName: s.sellerInfo?.businessName || "",
        businessAddress: s.sellerInfo?.businessAddress || "",
        gstNumber: s.sellerInfo?.gstNumber || "",
        description: s.sellerInfo?.description || "",
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    try {
      const data = await api.updateProfile({ name: form.name, phone: form.phone });
      if (data.user) setUser(data.user);
      toast.success("Profile updated");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveBusiness = async () => {
    try {
      await api.updateSellerStore({
        name: form.name,
        phone: form.phone,
        sellerInfo: {
          businessName: bizForm.businessName,
          businessAddress: bizForm.businessAddress,
          gstNumber: bizForm.gstNumber,
          description: bizForm.description,
        },
      });
      toast.success("Business information updated");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      await api.updateSellerPassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success("Password updated");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="vp-main space-y-5 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and store settings</p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-9 bg-muted rounded" />
            <div className="h-9 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </div>
      ) : (
        <>
          {/* Profile */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-muted p-1.5">
                <User className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Profile</h3>
            </div>
            <div className="space-y-3 max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-xs">Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Email</Label><Input value={form.email} disabled className="mt-1" /></div>
              </div>
              <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
              <Button onClick={handleSaveProfile} className="w-full min-h-11 rounded-lg sm:w-auto"><Save className="h-4 w-4 mr-2" /> Save Profile</Button>
            </div>
          </div>

          {/* Business Information */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-muted p-1.5">
                <Store className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Business Information</h3>
            </div>
            <div className="space-y-3 max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-xs">Business Name</Label><Input value={bizForm.businessName} onChange={(e) => setBizForm({ ...bizForm, businessName: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">GST Number</Label><Input value={bizForm.gstNumber} onChange={(e) => setBizForm({ ...bizForm, gstNumber: e.target.value })} className="mt-1" /></div>
              </div>
              <div><Label className="text-xs">Business Address</Label><Textarea rows={2} value={bizForm.businessAddress} onChange={(e) => setBizForm({ ...bizForm, businessAddress: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Store Description</Label><Textarea rows={3} value={bizForm.description} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} placeholder="Tell customers about your store..." className="mt-1" /></div>
              <Button onClick={handleSaveBusiness} className="w-full min-h-11 rounded-lg sm:w-auto"><Save className="h-4 w-4 mr-2" /> Save Business Info</Button>
            </div>
          </div>

          {/* Password */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-muted p-1.5">
                <Lock className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            </div>
            <div className="space-y-3 max-w-3xl">
              <div><Label className="text-xs">Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="mt-1" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-xs">New Password</Label><Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="mt-1" /></div>
                <div><Label className="text-xs">Confirm New Password</Label><Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="mt-1" /></div>
              </div>
              <Button onClick={handleChangePassword} className="w-full min-h-11 rounded-lg sm:w-auto"><Lock className="h-4 w-4 mr-2" /> Update Password</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
