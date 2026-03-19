"use client";

import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null; // The hook will redirect to login automatically
  }

  return <>{children}</>;
}
