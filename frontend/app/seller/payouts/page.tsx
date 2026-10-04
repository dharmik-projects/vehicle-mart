"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, DollarSign, TrendingUp, Clock, Save } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function SellerPayouts() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
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

  const earningsCards = [
    { label: "Total Earnings", value: formatPrice(earnings?.total || 0), icon: DollarSign },
    { label: "This Month", value: formatPrice(earnings?.thisMonth || 0), icon: TrendingUp },
    { label: "Pending", value: formatPrice(earnings?.pending || 0), icon: Clock },
  ];

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payouts & Earnings</h1>
        <p className="text-sm text-muted-foreground">Track your earnings and manage bank details</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="vp-stat"><div className="animate-pulse space-y-2"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-8 bg-muted rounded w-1/3" /></div></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {earningsCards.map((s, i) => (
            <div key={i} className="vp-stat">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2.5"><s.icon className="h-5 w-5 text-foreground" /></div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-base sm:text-xl font-bold text-foreground">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-muted p-1.5">
            <CreditCard className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Bank Details</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Account Holder</Label><Input value={bankForm.accountHolder} onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })} className="mt-1 h-9" /></div>
            <div><Label className="text-xs">Bank Name</Label><Input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} className="mt-1 h-9" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Account Number</Label><Input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} className="mt-1 h-9" /></div>
            <div><Label className="text-xs">IFSC Code</Label><Input value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })} className="mt-1 h-9" /></div>
          </div>
          <Button onClick={handleSaveBank} className="rounded-lg"><Save className="h-4 w-4 mr-2" /> Save Bank Details</Button>
        </div>
      </div>
    </div>
  );
}
