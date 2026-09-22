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
import toast from "react-hot-toast";

const accountLinks = [
  { href: '/orders', label: 'My Orders', icon: Package },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    setName(user.name);
    setPhone(user.phone || '');
  }, [user, router]);

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

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 fade-in">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">My Account</h1>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                <Badge variant="outline" className="text-[10px] mt-0.5">{user.role}</Badge>
              </div>
            </div>

            {/* Nav */}
            <nav className="space-y-0.5">
              <button onClick={() => setTab('profile')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'profile' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <User className="h-4 w-4" /> Profile
              </button>
              <button onClick={() => setTab('password')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'password' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Lock className="h-4 w-4" /> Password
              </button>
              <div className="border-t my-2" />
              {accountLinks.map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <link.icon className="h-4 w-4" /> {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {tab === 'profile' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Profile Information</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={user.email} disabled className="mt-1 bg-gray-50" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="mt-1" />
                </div>
                <p className="text-xs text-gray-400">Member since {formatDate((user as any).createdAt || new Date())}</p>
                <Button type="submit" disabled={saving} className="rounded-lg">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                <div>
                  <Label className="text-xs">Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="mt-1" />
                </div>
                <Button type="submit" disabled={saving} className="rounded-lg">
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
