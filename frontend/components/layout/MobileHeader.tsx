"use client";

import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";

export default function MobileHeader() {
  const { user } = useAuth();
  
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <BrandLogo className="h-10 w-auto" />
      </div>
      {user?.profile_picture ? (
        <img 
          src={user.profile_picture} 
          alt="Profile" 
          className="h-8 w-8 rounded-full object-cover ring-2 ring-white" 
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold uppercase ring-2 ring-white">
          {user?.username?.[0] || user?.user_code?.[0] || 'N'}
        </div>
      )}
    </header>
  );
}
