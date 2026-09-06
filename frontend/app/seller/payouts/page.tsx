"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, DollarSign, TrendingUp, Clock, Save } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function SellerPayouts() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bankForm, setBankForm] = useState({
    accountHolder: "", accountNumber: "", ifscCode: "", bankName: "",
  });

  useEffect(() => {
    if (!user || (user.role !== "seller" && user.role !== "admin")) { router.push("/login"); return; }
    loadPayouts();
  }, [user, router]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const data = await api.getSellerPayouts();
      setEarnings(data.earnings);
      if (data.payoutInfo) {
        setBankForm({
          accountHolder: data.payoutInfo.accountHolder || "",
          accountNumber: data.payoutInfo.accountNumber || "",
          ifscCode: data.payoutInfo.ifscCode || "",
          bankName: data.payoutInfo.bankName || "",
        });
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSaveBank = async () => {
    try {
      await api.updateSellerBankDetails(bankForm);
      toast.success("Bank details updated");
    } catch (err: any) { toast.error(err.message); }
  };

  if (!user || (user.role !== "seller" && user.role !== "admin")) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts & Earnings</h1>
        <p className="text-muted-foreground text-sm">Track your earnings and manage bank details</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-6"><div className="animate-pulse space-y-2"><div className="h-4 bg-gray-200 rounded w-1/2" /><div className="h-8 bg-gray-200 rounded w-1/3" /></div></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold">{formatPrice(earnings?.total || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold">{formatPrice(earnings?.thisMonth || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-yellow-50 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{formatPrice(earnings?.pending || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Bank Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Account Holder</Label><Input value={bankForm.accountHolder} onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })} /></div>
            <div><Label>Bank Name</Label><Input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Account Number</Label><Input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} /></div>
            <div><Label>IFSC Code</Label><Input value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })} /></div>
          </div>
          <Button onClick={handleSaveBank}><Save className="h-4 w-4 mr-2" /> Save Bank Details</Button>
        </CardContent>
      </Card>
    </div>
  );
}
