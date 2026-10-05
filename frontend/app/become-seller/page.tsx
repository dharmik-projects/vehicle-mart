"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Store, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function BecomeSellerPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ businessName: "", businessAddress: "", gstNumber: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.becomeSeller(form);
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Seller application submitted!");
      router.push("/seller");
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const labelClass = "text-[13px] font-medium normal-case tracking-normal text-foreground";
  const primaryBtnClass = "bg-primary text-primary-foreground shadow-soft hover:shadow-card";

  if (!user) return null;
  if (user.role === "seller") return (
    <div className="min-h-[60vh] flex items-center justify-center fade-in">
      <div className="text-center">
        <div className="w-14 h-14 bg-muted text-foreground rounded-xl border border-border flex items-center justify-center mx-auto mb-3">
          <Store className="h-7 w-7" />
        </div>
        <p className="text-foreground font-semibold mb-2">You&apos;re already a seller!</p>
        <Button variant="link" onClick={() => router.push("/seller")} className="text-primary hover:text-foreground">
          Go to Seller Dashboard <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-muted text-foreground rounded-xl border border-border flex items-center justify-center mx-auto mb-3">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl">Become a Seller</h1>
          <p className="text-sm text-muted-foreground mt-1">Start selling your vehicle parts on VehiclePart</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className={labelClass}>Business Name *</Label>
              <Input
                required
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Your business name"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className={labelClass}>Business Address *</Label>
              <Input
                required
                value={form.businessAddress}
                onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                placeholder="Full business address"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className={labelClass}>GST Number</Label>
              <Input
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                placeholder="Optional"
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className={labelClass}>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tell us about your business"
                className="mt-1.5 min-h-[100px]"
              />
            </div>
            <Button type="submit" className={`w-full h-12 text-[15px] ${primaryBtnClass}`} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Apply to Sell
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
