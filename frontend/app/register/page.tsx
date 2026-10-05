"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      toast.success("Account created successfully!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
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
          <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join VehiclePart to find quality spare parts</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className={labelClass}>Full Name</Label>
              <Input
                required
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>
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
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className={labelClass}>Confirm Password</Label>
              <Input
                type="password"
                required
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="mt-1.5 h-11"
              />
            </div>
            <Button type="submit" className={`w-full h-11 ${primaryBtnClass}`} disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create Account
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
