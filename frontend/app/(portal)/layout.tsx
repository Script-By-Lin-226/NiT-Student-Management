import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { AuthGuard } from "@/components/guards/AuthGuard";
import BrandLogo from "@/components/BrandLogo";
import { ParentOnlyDashboardGuard } from "@/components/guards/ParentOnlyDashboardGuard";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ParentOnlyDashboardGuard>
        <div className="min-h-screen bg-slate-50 flex">
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
          
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-auto" />
             
            </div>
            <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold uppercase ring-2 ring-white">
              N
            </div>
          </header>

          <main className="flex-1 pb-20 lg:pb-8 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
      </ParentOnlyDashboardGuard>
    </AuthGuard>
  );
}
