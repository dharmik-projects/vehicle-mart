"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, useCartStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loadCart = useCartStore((s) => s.loadCart);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      const stored = useAuthStore.getState().user;
      toast.success("Logged in successfully!");
      // Navigate IMMEDIATELY — the cart refresh fires without blocking the
      // redirect (its in-flight dedupe + 8s freshness guard make it safe).
      if (stored?.role === "admin") {
        router.push("/admin");
      } else if (stored?.role === "seller") {
        router.push("/seller");
      } else {
        void loadCart();
        router.push("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const labelClass = "text-[13px] font-medium normal-case tracking-normal text-foreground";
  const primaryBtnClass = "bg-primary text-primary-foreground shadow-soft hover:shadow-card";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 fade-in">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-sm font-bold mx-auto mb-4">
            VP
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your VehiclePart account</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className={labelClass}>Email</Label>
              <Input
                type="email"
                required
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className={labelClass}>Password</Label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>
            <Button type="submit" className={`w-full h-11 ${primaryBtnClass}`} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
