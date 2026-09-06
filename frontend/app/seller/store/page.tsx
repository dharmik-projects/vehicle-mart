"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, Save, Lock } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

export default function SellerStore() {
  const router = useRouter();
  const { user } = useAuthStore();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Store Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your store information and credentials</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> Business Information</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Display Name</Label><Input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} /></div>
          </div>
          <div><Label>Business Name</Label><Input value={storeForm.businessName} onChange={(e) => setStoreForm({ ...storeForm, businessName: e.target.value })} /></div>
          <div><Label>Business Address</Label><Textarea rows={2} value={storeForm.businessAddress} onChange={(e) => setStoreForm({ ...storeForm, businessAddress: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>GST Number</Label><Input value={storeForm.gstNumber} onChange={(e) => setStoreForm({ ...storeForm, gstNumber: e.target.value })} /></div>
            <div />
          </div>
          <div><Label>Store Description</Label><Textarea rows={3} value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} placeholder="Tell customers about your store..." /></div>
          <Button onClick={handleSaveStore}><Save className="h-4 w-4 mr-2" /> Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Current Password</Label><Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>New Password</Label><Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} /></div>
            <div><Label>Confirm New Password</Label><Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} /></div>
          </div>
          <Button onClick={handleChangePassword}><Lock className="h-4 w-4 mr-2" /> Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}
