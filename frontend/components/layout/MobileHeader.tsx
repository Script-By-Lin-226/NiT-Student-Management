"use client";

import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Home, BookOpen, Clock, CalendarDays, Award, User, LogOut, Users, Shield, DoorOpen, CalendarClock, CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

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
  { name: "Staff", href: "/admin/users", icon: Shield },
  { name: "Academic Yrs", href: "/admin/academic-years", icon: CalendarDays },
  { name: "Courses", href: "/admin/courses", icon: BookOpen },
  { name: "Enrollments", href: "/admin/enrollments", icon: Award },
  { name: "Rooms", href: "/admin/rooms", icon: DoorOpen },
  { name: "Timetable", href: "/admin/timetables", icon: CalendarClock },
  { name: "Attendance", href: "/admin/attendance", icon: Clock },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Activity Logs", href: "/admin/activity", icon: CalendarDays },
  { name: "Profile", href: "/profile", icon: User },
];

export default function MobileHeader() {
  const { isStudent, isParent, isStaff, isAdmin, logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  let navigation = defaultNav;
  if (isStudent) navigation = studentNav;
  if (isParent) navigation = parentNav;
  if (isStaff) navigation = staffNav;
  if (user?.role === "sales") navigation = adminNav.filter(item => item.name !== "Activity Logs" && item.name !== "Staff");
  if (isAdmin) navigation = adminNav;

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Menu className="h-6 w-6 text-slate-600 cursor-pointer" onClick={() => setIsOpen(true)} />
          <BrandLogo className="h-8 w-auto" />
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

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/80 transition-opacity" onClick={() => setIsOpen(false)} />
          
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-shrink-0 items-center px-4">
              <BrandLogo className="h-10 w-auto" />
            </div>
            
            <div className="mt-5 h-0 flex-1 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={clsx(
                        isActive
                          ? "bg-brand-600 text-white"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        "group flex items-center px-3 py-2 text-base font-medium rounded-md transition-all"
                      )}
                    >
                      <item.icon
                        className={clsx(
                          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-500",
                          "mr-4 flex-shrink-0 h-6 w-6"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            <div className="flex flex-shrink-0 border-t border-slate-200 p-4 flex-col gap-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full justify-start group flex items-center px-3 py-2 text-base font-medium rounded-md text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="text-red-500 mr-4 h-6 w-6 group-hover:text-red-600" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
