"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthService } from "@/services/auth.service";

export interface AuthUser {
  token: string;
  role: string;
  user_code: string;
  username?: string;
  profile_picture?: string;
}

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const user_code = localStorage.getItem("user_code");
    const username = localStorage.getItem("username") || undefined;
    const profile_picture = localStorage.getItem("profile_picture") || undefined;

    if (token && role && user_code) {
      setUser({ token, role, user_code, username, profile_picture });
    } else {
      setUser(null);
      if (pathname && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
        router.replace("/login");
      }
    }
    setLoading(false);
  }, [pathname, router]);

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.error("Backend logout failed", e);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_code");
    localStorage.removeItem("username");
    localStorage.removeItem("profile_picture");
    setUser(null);
    router.replace("/login");
  };

  return {
    user,
    loading,
    logout,
    isStudent: user?.role === "student",
    isParent: user?.role === "parent",
    isStaff: ["hr", "manager", "sales", "teacher"].includes(user?.role || ""),
    isAdmin: user?.role === "admin",
    isAdminOrSales: user?.role === "admin" || user?.role === "sales",
  };
}
