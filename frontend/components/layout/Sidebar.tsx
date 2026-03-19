"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Clock, CalendarDays, Award, User, LogOut, Users, Shield, DoorOpen, CalendarClock, CreditCard } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import BrandLogo from "@/components/BrandLogo";

const defaultNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Profile", href: "/profile", icon: User },
];

const studentNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Courses", href: "/courses", icon: BookOpen },
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Timetable", href: "/timetable", icon: CalendarDays },
  { name: "Grades", href: "/grades", icon: Award },
];

const parentNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
];

const staffNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Profile", href: "/profile", icon: User },
];

const adminNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Parents", href: "/admin/parents", icon: Users },
  { name: "Academic Yrs", href: "/admin/academic-years", icon: CalendarDays },
  { name: "Courses", href: "/admin/courses", icon: BookOpen },
  { name: "Enrollments", href: "/admin/enrollments", icon: Award },
  { name: "Rooms", href: "/admin/rooms", icon: DoorOpen },
  { name: "Timetable", href: "/admin/timetables", icon: CalendarClock },
  { name: "Attendance", href: "/admin/attendance", icon: Clock },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Profile", href: "/profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isStudent, isParent, isStaff, isAdmin, logout, user } = useAuth();

  let navigation = defaultNav;
  if (isStudent) navigation = studentNav;
  if (isParent) navigation = parentNav;
  if (isStaff) navigation = staffNav;
  if (isAdmin) navigation = adminNav;

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-slate-200 lg:bg-white lg:pt-5 lg:pb-4">
      <div className="flex items-center px-6">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-11 w-auto" />
        </div>
      </div>

      <div className="mt-8 flex flex-col flex-1 gap-y-1">
        <div className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu</div>
        <nav className="flex-1 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all"
                )}
              >
                <item.icon
                  className={clsx(
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-500",
                    "mr-3 flex-shrink-0 h-5 w-5"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-4">
        <button
          onClick={logout}
          className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
        >
          <LogOut className="text-slate-400 mr-3 h-5 w-5 group-hover:text-slate-500" />
          Log out
        </button>
        <div className="mt-4 flex items-center px-3 py-2">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold uppercase">
              {user?.user_code?.[0]}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-slate-700">{user?.user_code}</p>
            <p className="text-xs text-slate-500 uppercase">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
