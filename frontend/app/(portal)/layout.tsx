import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/guards/AuthGuard";
import BrandLogo from "@/components/BrandLogo";
import { ParentOnlyDashboardGuard } from "@/components/guards/ParentOnlyDashboardGuard";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileNav from "@/components/layout/MobileNav";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ParentOnlyDashboardGuard>
        <div className="min-h-screen bg-slate-50 flex">
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
          
          {/* Mobile Header */}
          <MobileHeader />

          <main className="flex-1 pb-24 lg:pb-8 pt-6 px-4 sm:px-6 lg:px-6 xl:px-8 max-w-[1600px] mx-auto w-full">
            {children}
          </main>

          {/* Mobile Bottom Navigation (for app-like feel) */}
          <MobileNav />
        </div>
      </div>
      </ParentOnlyDashboardGuard>
    </AuthGuard>
  );
}
