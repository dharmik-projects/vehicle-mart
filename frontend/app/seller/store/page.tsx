"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, Save, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

export default function SellerStore() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [storeForm, setStoreForm] = useState({
    name: "", phone: "", businessName: "", businessAddress: "", gstNumber: "", description: "",
  });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadStore();
  }, [user, router]);

  const loadStore = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerStore();
      const s = data.store;
      setStoreForm({
        name: s.name || "",
        phone: s.phone || "",
        businessName: s.sellerInfo?.businessName || "",
        businessAddress: s.sellerInfo?.businessAddress || "",
        gstNumber: s.sellerInfo?.gstNumber || "",
        description: s.sellerInfo?.description || "",
      });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSaveStore = async () => {
    try {
      await api.updateSellerStore({
        name: storeForm.name,
        phone: storeForm.phone,
        sellerInfo: {
          businessName: storeForm.businessName,
          businessAddress: storeForm.businessAddress,
          gstNumber: storeForm.gstNumber,
          description: storeForm.description,
        },
      });
      toast.success("Store profile updated");
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
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Store Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your store information and credentials</p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-9 bg-muted rounded" />
            <div className="h-9 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-muted p-1.5">
                <Store className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Business Information</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Display Name</Label><Input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} className="mt-1 h-9" /></div>
                <div><Label className="text-xs">Phone</Label><Input value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} className="mt-1 h-9" /></div>
              </div>
              <div><Label className="text-xs">Business Name</Label><Input value={storeForm.businessName} onChange={(e) => setStoreForm({ ...storeForm, businessName: e.target.value })} className="mt-1 h-9" /></div>
              <div><Label className="text-xs">Business Address</Label><Textarea rows={2} value={storeForm.businessAddress} onChange={(e) => setStoreForm({ ...storeForm, businessAddress: e.target.value })} className="mt-1" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">GST Number</Label><Input value={storeForm.gstNumber} onChange={(e) => setStoreForm({ ...storeForm, gstNumber: e.target.value })} className="mt-1 h-9" /></div>
                <div />
              </div>
              <div><Label className="text-xs">Store Description</Label><Textarea rows={3} value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} placeholder="Tell customers about your store..." className="mt-1" /></div>
              <Button onClick={handleSaveStore} className="rounded-lg"><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-muted p-1.5">
                <Lock className="h-4 w-4 text-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            </div>
            <div className="space-y-3">
              <div><Label className="text-xs">Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="mt-1 h-9" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">New Password</Label><Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="mt-1 h-9" /></div>
                <div><Label className="text-xs">Confirm New Password</Label><Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} className="mt-1 h-9" /></div>
              </div>
              <Button onClick={handleChangePassword} className="rounded-lg"><Lock className="h-4 w-4 mr-2" /> Update Password</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
