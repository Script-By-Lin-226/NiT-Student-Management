"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function ParentOnlyDashboardGuard({ children }: { children: ReactNode }) {
  const { isParent, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isParent) return;
    if (pathname === "/dashboard") return;
    router.replace("/dashboard");
  }, [isParent, loading, pathname, router]);

  return <>{children}</>;
}

