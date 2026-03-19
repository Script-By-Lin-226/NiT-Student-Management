"use client";

import { useEffect, useState } from "react";
import { PortalService, PortalUser } from "@/services/portal.service";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Shield, Activity, Fingerprint, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logout, isStudent, isStaff } = useAuth();
  const [profile, setProfile] = useState<PortalUser | null>(null);

  useEffect(() => {
    if (isStudent) {
      PortalService.getStudentMe().then(setProfile).catch(console.error);
    }
  }, [isStudent]);

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
    </div>
  );
}
