"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, BookOpen, Clock, CalendarDays, Award, User, Users, 
  DoorOpen, CalendarClock, LogOut, LayoutGrid, X, 
  Shield, CreditCard, Database, Activity, BarChart
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

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

const teacherNav = [
  { name: "Home", href: "/teacher/dashboard", icon: Home },
  { name: "Class", href: "/teacher/classes", icon: BookOpen },
  { name: "Me", href: "/profile", icon: User },
];

const accountantNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Finance", href: "/admin/finance", icon: BarChart },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Me", href: "/profile", icon: User },
];

const studentAffairsNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Enrolls", href: "/admin/enrollments", icon: Award },
  { name: "Attendance", href: "/admin/attendance", icon: Clock },
  { name: "Time", href: "/admin/timetables", icon: CalendarClock },
  { name: "Me", href: "/profile", icon: User },
];

const adminNav = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Parents", href: "/admin/parents", icon: Users },
  { name: "Staff", href: "/admin/users", icon: Shield },
  { name: "Yrs", href: "/admin/academic-years", icon: CalendarDays },
  { name: "Courses", href: "/admin/courses", icon: BookOpen },
  { name: "Enrolls", href: "/admin/enrollments", icon: Award },
  { name: "Rooms", href: "/admin/rooms", icon: DoorOpen },
  { name: "Time", href: "/admin/timetables", icon: CalendarClock },
  { name: "Attendance", href: "/admin/attendance", icon: Clock },
  { name: "Payments", href: "/admin/payments", icon: CreditCard },
  { name: "Backup", href: "/admin/backup", icon: Database },
  { name: "Logs", href: "/admin/activity", icon: Activity },
  { name: "Me", href: "/profile", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { isStudent, isParent, isStaff, isAdmin, logout, user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  // Prevent scroll when more menu is open
  useEffect(() => {
    if (showMore) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showMore]);

  let navigation = studentNav;
  if (isParent) navigation = parentNav;
  if (isStaff) navigation = staffNav;
  if (user?.role === "teacher") navigation = teacherNav;
  if (user?.role === "accountant") navigation = accountantNav;
  if (user?.role === "student_affairs") navigation = studentAffairsNav;
  if (user?.role === "sales" || user?.role === "manager") navigation = adminNav.filter(item => item.name !== "Logs" && item.name !== "Staff" && item.name !== "Backup");
  if (isAdmin) navigation = adminNav;

  const primaryNav = navigation.length > 5 ? navigation.slice(0, 4) : navigation;
  const secondaryNav = navigation.length > 5 ? navigation : [];

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-[60] flex flex-col transform transition-all duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowMore(false)}
          />
          
          <div className="relative mt-auto bg-white rounded-t-[3rem] p-8 pb-32 animate-in slide-in-from-bottom duration-500 max-h-[85vh] overflow-y-auto custom-scrollbar shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white pb-4 z-10">
               <div>
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight font-heading">System Navigation</h3>
                  <p className="text-[10px] font-premium text-slate-400 mt-1 uppercase tracking-widest">All Available Modules</p>
               </div>
               <button 
                  onClick={() => setShowMore(false)}
                  className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 active:scale-90 transition-all font-bold"
               >
                  <X size={24} />
               </button>
            </div>

            <div className="space-y-6">
              {/* Category: Academics */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-4">Academic Modules</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-2 space-y-1">
                  {secondaryNav.filter(n => ["Students", "Courses", "Enrolls", "Attendance", "Time", "Yrs"].includes(n.name)).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMore(false)}
                        className={clsx(
                          "flex items-center gap-4 p-3.5 rounded-2xl transition-all active:scale-95 group",
                          isActive ? "bg-white text-brand-600 shadow-sm" : "text-slate-600 hover:bg-white/50"
                        )}
                      >
                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm", isActive ? "bg-brand-600 text-white" : "bg-white text-slate-400 group-hover:text-brand-500")}>
                          <item.icon size={18} className="stroke-[2.5]" />
                        </div>
                        <span className="flex-1 font-premium text-sm font-bold tracking-tight">{item.name === 'Yrs' ? 'Academic Years' : item.name === 'Enrolls' ? 'Enrollments' : item.name === 'Time' ? 'Timetables' : item.name}</span>
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 group-hover:text-brand-400 group-hover:bg-brand-50 transition-colors">
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Category: Finance & Ops */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-4">Operations & Finance</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-2 space-y-1">
                  {secondaryNav.filter(n => ["Payments", "Finance", "Rooms", "Parents", "Staff"].includes(n.name)).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMore(false)}
                        className={clsx(
                          "flex items-center gap-4 p-3.5 rounded-2xl transition-all active:scale-95 group",
                          isActive ? "bg-white text-brand-600 shadow-sm" : "text-slate-600 hover:bg-white/50"
                        )}
                      >
                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm", isActive ? "bg-brand-600 text-white" : "bg-white text-slate-400 group-hover:text-brand-500")}>
                          <item.icon size={18} className="stroke-[2.5]" />
                        </div>
                        <span className="flex-1 font-premium text-sm font-bold tracking-tight">{item.name}</span>
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 group-hover:text-brand-400 group-hover:bg-brand-50 transition-colors">
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Category: System */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-4">System Management</h4>
                <div className="bg-slate-50/50 rounded-[2rem] p-2 space-y-1">
                  {secondaryNav.filter(n => ["Backup", "Logs", "Me"].includes(n.name)).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMore(false)}
                        className={clsx(
                          "flex items-center gap-4 p-3.5 rounded-2xl transition-all active:scale-95 group",
                          isActive ? "bg-white text-brand-600 shadow-sm" : "text-slate-600 hover:bg-white/50"
                        )}
                      >
                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm", isActive ? "bg-brand-600 text-white" : "bg-white text-slate-400 group-hover:text-brand-500")}>
                          <item.icon size={18} className="stroke-[2.5]" />
                        </div>
                        <span className="flex-1 font-premium text-sm font-bold tracking-tight">{item.name === 'Me' ? 'My Profile' : item.name === 'Logs' ? 'Activity Log' : item.name}</span>
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 group-hover:text-brand-400 group-hover:bg-brand-50 transition-colors">
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowMore(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-3 p-5 rounded-[2rem] bg-rose-50 text-rose-500 active:scale-95 transition-all mt-8 border-2 border-rose-100/50 shadow-sm"
              >
                <LogOut size={20} className="stroke-[3]" />
                <span className="font-premium text-sm font-black tracking-widest uppercase">Sign Out System</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Bar */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
          <nav className="flex items-center justify-between gap-1">
            {primaryNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative flex-1 group",
                    isActive ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <div className={clsx(
                    "absolute inset-0 rounded-2xl transition-all duration-300",
                    isActive ? "bg-brand-50 scale-100 opacity-100" : "scale-50 opacity-0 group-hover:scale-90 group-hover:opacity-50"
                  )} />
                  
                  <item.icon
                    className={clsx(
                      "h-5 w-5 mb-1.5 transition-transform duration-300 relative z-10",
                      isActive ? "scale-110" : "group-hover:scale-105"
                    )}
                  />
                  <span className={clsx("font-premium relative z-10 block whitespace-nowrap", isActive ? "opacity-100 text-brand-600" : "opacity-40")}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
            
            {navigation.length > 5 && (
               <>
                <div className="w-px h-8 bg-slate-100 mx-1 shrink-0" />
                <button
                  onClick={() => setShowMore(!showMore)}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative flex-1 group",
                    showMore ? "text-brand-600" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                   <div className={clsx(
                    "absolute inset-0 rounded-2xl transition-all duration-300",
                    showMore ? "bg-brand-50 scale-100 opacity-100" : "scale-50 opacity-0 group-hover:scale-90 group-hover:opacity-50"
                  )} />
                  <LayoutGrid className={clsx("h-5 w-5 mb-1.5 transition-all duration-300 relative z-10", showMore ? "scale-110 rotate-90 text-brand-600" : "group-hover:scale-105")} />
                  <span className={clsx("font-premium relative z-10 block uppercase", showMore ? "text-brand-600 opacity-100" : "opacity-40")}>More</span>
                </button>
               </>
            )}

            {navigation.length <= 5 && (
              <>
                <div className="w-px h-8 bg-slate-100 mx-1 shrink-0" />
                <button
                  onClick={logout}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl transition-all text-rose-500 hover:text-rose-600 hover:bg-rose-50 flex-1 group"
                >
                  <LogOut className="h-5 w-5 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="font-premium relative z-10 block opacity-40">Exit</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
