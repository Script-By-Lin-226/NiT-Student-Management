"use client";

import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";

export default function MobileHeader() {
  const { user } = useAuth();

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 flex items-center justify-between px-5 py-4 h-20 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-3 active:scale-95 transition-transform duration-300">
        <BrandLogo className="h-10 w-auto grayscale-0" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end mr-1">
           <span className="font-premium text-brand-600 text-[8px] leading-none mb-1 opacity-80">
              {user?.role === "sales" ? "Sales Team" : user?.role || "GUEST"}
           </span>
           <span className="text-sm font-bold text-slate-800 leading-none tracking-tight">
              {user?.username?.split(' ')[0] || 'Member'}
           </span>
        </div>
        <div className="relative group p-1 rounded-full bg-gradient-to-tr from-brand-500 to-brand-600 shadow-md transform hover:rotate-12 transition-all duration-500">
           <div className="bg-white rounded-full p-0.5">
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                className="h-9 w-9 rounded-full object-cover" 
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-slate-50 flex items-center justify-center text-brand-600 font-black text-xs uppercase">
                {user?.username?.[0] || 'N'}
              </div>
            )}
           </div>
        </div>
      </div>
    </header>
  );
}
