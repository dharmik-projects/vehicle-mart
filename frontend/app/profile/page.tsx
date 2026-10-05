"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Phone, Lock, Save, Package, Heart, MapPin, ShoppingBag, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ListRowsSkeleton } from "@/components/ui/page-skeleton";
import toast from "react-hot-toast";

const accountLinks = [
  { href: '/orders', label: 'My Orders', icon: Package },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  useEffect(() => {
    if (authLoading) return; // wait for auth resolution — never bounce to /login mid-flight
    if (!user) { router.push('/login'); return; }
    setName(user.name);
    setPhone(user.phone || '');
  }, [user, authLoading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.updateProfile({ name, phone });
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Profile updated!');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (authLoading) return <ListRowsSkeleton count={6} />;
  if (!user) return null;

  const labelClass = "text-[13px] font-medium normal-case tracking-normal text-foreground";
  const primaryBtnClass = "bg-primary text-primary-foreground shadow-soft hover:shadow-card";

  return (
    <div className="vp-container py-6 sm:py-8 fade-in">
      <h1 className="mb-6 text-xl font-display font-bold text-foreground sm:text-2xl">My Account</h1>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Sidebar */}
        <div className="min-w-0 md:col-span-1">
          <div className="bg-card rounded-lg border border-border p-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              <div className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-foreground">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <Badge variant="outline" className="text-xs mt-0.5">{user.role}</Badge>
              </div>
            </div>

            {/* Nav — chip row on phones, stacked list from md up */}
            <nav className="flex flex-wrap gap-2 md:block md:space-y-0.5 md:gap-0">
              <button onClick={() => setTab('profile')} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors md:w-full ${tab === 'profile' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground md:border-transparent md:bg-transparent'}`}>
                <User className="h-4 w-4 shrink-0" /> Profile
              </button>
              <button onClick={() => setTab('password')} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors md:w-full ${tab === 'password' ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground md:border-transparent md:bg-transparent'}`}>
                <Lock className="h-4 w-4 shrink-0" /> Password
              </button>
              <div className="my-2 hidden border-t border-border md:block" />
              {accountLinks.map((link) => (
                <Link key={link.href} href={link.href} className="flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:w-full md:border-transparent md:bg-transparent">
                  <link.icon className="h-4 w-4 shrink-0" /> {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 md:col-span-3">
          {tab === 'profile' ? (
            <div className="bg-card rounded-lg border border-border p-5 sm:p-6">
              <h2 className="text-base font-bold text-foreground mb-4">Profile Information</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                <div>
                  <Label className={labelClass}>Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11" />
                </div>
                <div>
                  <Label className={labelClass}>Email</Label>
                  <Input value={user.email} disabled className="mt-1 bg-muted h-11" />
                </div>
                <div>
                  <Label className={labelClass}>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="mt-1 h-11" />
                </div>
                <p className="text-xs text-muted-foreground">Member since {formatDate((user as any).createdAt || new Date())}</p>
                <Button type="submit" disabled={saving} className={`${primaryBtnClass} h-11 w-full sm:w-auto`}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-5 sm:p-6">
              <h2 className="text-base font-bold text-foreground mb-4">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                <div>
                  <Label className={labelClass}>Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1 h-11" />
                </div>
                <div>
                  <Label className={labelClass}>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="mt-1 h-11" />
                </div>
                <Button type="submit" disabled={saving} className={`${primaryBtnClass} h-11 w-full sm:w-auto`}>
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
