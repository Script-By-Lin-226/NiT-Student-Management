"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Clock, CalendarDays, Award, User, Users, DoorOpen, CalendarClock, LogOut } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";

const studentNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Courses", href: "/courses", icon: BookOpen },
  { name: "Attend", href: "/attendance", icon: Clock },
  { name: "Me", href: "/profile", icon: User },
];

const parentNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Me", href: "/profile", icon: User },
];

const staffNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Attend", href: "/attendance", icon: Clock },
  { name: "Me", href: "/profile", icon: User },
];

const adminNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Parents", href: "/admin/parents", icon: Users },
  { name: "Courses", href: "/admin/courses", icon: BookOpen },
  { name: "Me", href: "/profile", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { isStudent, isParent, isStaff, isAdmin, logout, user } = useAuth();

  let navigation = studentNav;
  if (isParent) navigation = parentNav;
  if (isStaff) navigation = staffNav;
  if (user?.role === "sales") navigation = adminNav;
  if (isAdmin) navigation = adminNav;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe pb-3 pt-2 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <nav className="flex items-center justify-start sm:justify-around px-2 overflow-x-auto no-scrollbar gap-1 sm:gap-0">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center min-w-[64px] sm:w-full focus:outline-none transition-all py-1 rounded-xl relative",
                isActive ? "text-brand-600 scale-105" : "text-slate-500 hover:text-slate-900"
              )}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-brand-600 rounded-b-full shadow-[0_2px_4px_rgba(79,70,229,0.3)] animate-in slide-in-from-top-1 duration-300" />
              )}
              <item.icon
                className={clsx(
                  "h-5 w-5 mb-0.5 transition-all",
                  isActive ? "text-brand-600 drop-shadow-sm" : "text-slate-400"
                )}
              />
              <span className={clsx("text-[10px] font-bold tracking-tight", isActive ? "text-brand-700" : "text-slate-500")}>
                {item.name}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-brand-600 rounded-full" />
              )}
            </Link>
          );
        })}
        <button
          onClick={logout}
          className="flex flex-col items-center justify-center min-w-[64px] sm:w-full focus:outline-none transition-all py-1 rounded-xl text-red-500 hover:text-red-600"
        >
          <LogOut className="h-5 w-5 mb-0.5 text-red-400" />
          <span className="text-[10px] font-bold tracking-tight text-red-500">Log out</span>
        </button>
      </nav>
    </div>
  );
}
