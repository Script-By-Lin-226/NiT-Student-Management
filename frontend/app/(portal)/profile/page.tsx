"use client";

import { useEffect, useState } from "react";
import { PortalService, PortalUser } from "@/services/portal.service";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Shield, Activity, Fingerprint, LogOut, Key, Loader2 } from "lucide-react";
import { AdminService } from "@/services/admin.service";

export default function ProfilePage() {
  const { user, logout, isStudent, isStaff } = useAuth();
  const [profile, setProfile] = useState<PortalUser | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isStudent) {
      PortalService.getStudentMe().then(setProfile).catch(console.error);
    }
  }, [isStudent]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await AdminService.changeSelfPassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess("Your password has been changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to change password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="text-slate-500 font-medium text-sm mt-1 mb-6">Manage your account settings.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-brand-600 to-indigo-400"></div>
        
        <div className="px-6 sm:px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="w-24 h-24 rounded-full bg-white p-1.5 shadow-md">
              <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <User className="w-10 h-10" />
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900">{profile?.username || user?.user_code}</h2>
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest">{profile?.role || user?.role}</p>
        </div>

        <div className="border-t border-slate-100 px-6 sm:px-8 py-6 space-y-6 bg-slate-50">
           <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Account Information</h3>
           
           <div className="space-y-4">
             <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                   <Fingerprint className="w-5 h-5" />
                </div>
                <div className="flex-1">
                   <p className="text-xs font-semibold text-slate-400 uppercase">User Code / ID</p>
                   <p className="text-sm font-bold text-slate-800">{profile?.user_code || user?.user_code}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                   <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1">
                   <p className="text-xs font-semibold text-slate-400 uppercase">Email Address</p>
                   <p className="text-sm font-bold text-slate-800">{profile?.email || "N/A"}</p>
                </div>
             </div>

             <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                   <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1">
                   <p className="text-xs font-semibold text-slate-400 uppercase">Status</p>
                   <p className="text-sm font-bold text-slate-800">
                     {profile?.is_active ? "Active" : "Inactive"}
                   </p>
                </div>
             </div>
           </div>
           
           <div className="pt-6">
             <button 
                onClick={logout}
                className="w-full sm:w-auto px-6 py-2.5 bg-red-50 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
             >
                <LogOut className="w-4 h-4" />
                Sign out of device
             </button>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Security</h3>
            <p className="text-xs text-slate-500 font-medium tracking-tight">Update your account password.</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold py-3 px-4 rounded-xl">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold py-3 px-4 rounded-xl">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Current Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
