"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Activity, 
  Fingerprint, 
  LogOut, 
  Key, 
  Loader2, 
  Camera, 
  Phone, 
  MapPin, 
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { AdminService } from "@/services/admin.service";
import { AuthService } from "@/services/auth.service";
import { toast } from "sonner";
import Image from "next/image";

export default function ProfilePage() {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  
  // Profile Update State
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  // Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI State
  const [busy, setBusy] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await AuthService.getMe();
      setProfile(data);
      // Initialize form
      setUsername(data.username || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
    } catch (err) {
      console.error("Failed to fetch profile", err);
      toast.error("Could not load profile information");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await AuthService.updateProfile({ 
        username, 
        email, 
        phone,
        address
      });
      toast.success("Profile updated successfully");
      setEditMode(false);
      await fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large. Max 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setBusy(true);
      try {
        await AuthService.updateProfile({ profile_picture: base64String });
        toast.success("Profile picture updated");
        await fetchProfile();
      } catch (err) {
        toast.error("Failed to upload image");
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      await AdminService.changeSelfPassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Secure Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-slate-900">Account Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your identity and security preferences.</p>
        </div>
        <button 
          onClick={logout}
          className="btn-secondary btn-sm inline-flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Profile Information</h3>
              {!editMode && (
                <button 
                  onClick={() => setEditMode(true)}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 uppercase tracking-widest px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
            
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center mb-8">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-lg bg-slate-100 ring-1 ring-slate-200 relative overflow-hidden flex items-center justify-center">
                    {profile?.profile_picture ? (
                      <Image 
                        src={profile.profile_picture} 
                        alt="Profile" 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <UserIcon className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900">{profile?.username || 'Name not set'}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em] px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                      {profile?.role}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <div className={`w-2 h-2 rounded-full ${profile?.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {profile?.is_active ? "Active Account" : "Archived"}
                    </span>
                  </div>
                </div>
              </div>

              {editMode ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Full Name</label>
                      <input 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-500 outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Email Address</label>
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-500 outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Phone</label>
                      <input 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Location</label>
                      <input 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      type="submit" 
                      disabled={busy}
                      className="btn-primary btn-sm flex-1 sm:flex-none"
                    >
                      Save Changes
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setEditMode(false)}
                      className="btn-secondary btn-sm flex-1 sm:flex-none"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identification</p>
                    <p className="text-sm font-semibold text-slate-700">{profile?.user_code}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</p>
                    <p className="text-sm font-semibold text-slate-700">{profile?.email || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</p>
                    <p className="text-sm font-semibold text-slate-700">{profile?.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Home Base</p>
                    <p className="text-sm font-semibold text-slate-700">{profile?.address || 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Access Security</h3>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Current Password</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Verify Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-brand-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary btn-md w-full sm:w-auto"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Update Security Credentials
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* System Side Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-brand-600" />
              <h4 className="font-serif font-bold text-sm uppercase tracking-tight text-slate-900">System Identity</h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Authorization</p>
                <p className="text-xs font-semibold text-emerald-600">Verified Credentials</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Access Level</p>
                <p className="text-xs font-semibold text-slate-700">{profile?.role?.toUpperCase()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3 shrink-0">
               <Info className="w-5 h-5 text-blue-600" />
               <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Usage Policy</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Profile information is strictly monitored for security and authentication management. Please ensure your contact details remain up-to-date for system alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
