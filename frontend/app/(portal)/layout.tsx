import { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { AuthGuard } from "@/components/guards/AuthGuard";
import BrandLogo from "@/components/BrandLogo";
import { ParentOnlyDashboardGuard } from "@/components/guards/ParentOnlyDashboardGuard";
import MobileHeader from "@/components/layout/MobileHeader";

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
          <MobileHeader />

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
