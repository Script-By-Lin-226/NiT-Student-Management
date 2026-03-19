"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Clock, CalendarDays, Award, User, Users, DoorOpen, CalendarClock } from "lucide-react";
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
  { name: "Rooms", href: "/admin/rooms", icon: DoorOpen },
  { name: "TT", href: "/admin/timetables", icon: CalendarClock },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { isStudent, isParent, isStaff, isAdmin } = useAuth();

  let navigation = studentNav;
  if (isParent) navigation = parentNav;
  if (isStaff) navigation = staffNav;
  if (isAdmin) navigation = adminNav;

  return (
    <div className="lg:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe pb-4 pt-2 z-50">
      <nav className="flex items-center justify-around px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center w-full focus:outline-none transition-all",
                isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <item.icon
                className={clsx(
                  "h-6 w-6 mb-1 transition-all",
                  isActive ? "text-brand-600 drop-shadow-sm" : "text-slate-400"
                )}
              />
              <span className={clsx("text-[10px] font-medium tracking-wide", isActive ? "text-brand-600" : "text-slate-500")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
