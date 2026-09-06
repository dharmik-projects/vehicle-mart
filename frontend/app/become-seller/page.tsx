"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

export default function BecomeSellerPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({ businessName: '', businessAddress: '', gstNumber: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!user) router.push('/login'); }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.becomeSeller(form);
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Seller application submitted!');
      router.push('/seller');
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  if (!user) return null;
  if (user.role === 'seller') return (
    <div className="min-h-[60vh] flex items-center justify-center"><p>You're already a seller! <Button variant="link" onClick={() => router.push('/seller')}>Go to Dashboard</Button></p></div>
  );

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Become a Seller</CardTitle>
          <CardDescription>Start selling your vehicle parts on VehiclePart</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Business Name *</Label><Input required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></div>
            <div><Label>Business Address *</Label><Input required value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} /></div>
            <div><Label>GST Number</Label><Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="Optional" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell us about your business" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Submitting...' : 'Apply to Sell'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
