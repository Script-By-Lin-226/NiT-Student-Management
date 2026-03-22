"use client";

import { useEffect, useMemo, useState } from "react";
import { Child, PortalService, StudentCourse, StudentAttendance } from "@/services/portal.service";
import { useAuth } from "@/hooks/useAuth";
import { AdminAttendanceRecord, AdminCourse, AdminEnrollment, AdminRoom, AdminService, AdminStudent } from "@/services/admin.service";
import { Users, BookOpen, Fingerprint, Award, TrendingUp, CheckCircle2, DoorOpen, UserRound } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const studentChartData = [
  { name: "Jan", pv: 2400 },
  { name: "Feb", pv: 1398 },
  { name: "Mar", pv: 3800 },
  { name: "Apr", pv: 3908 },
  { name: "May", pv: 4800 },
  { name: "Jun", pv: 3800 },
  { name: "Jul", pv: 4300 },
];

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastNDays(n: number) {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(formatYmd(d));
  }
  return days;
}

export default function DashboardPage() {
  const { isStudent, isParent, isAdminOrSales, isAdmin, user } = useAuth();
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance | null>(null);

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [childAttendance, setChildAttendance] = useState<{ date: string; status: "Present" | "Absent" }[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);

  const [adminStudents, setAdminStudents] = useState<AdminStudent[]>([]);
  const [adminCourses, setAdminCourses] = useState<AdminCourse[]>([]);
  const [adminEnrollments, setAdminEnrollments] = useState<AdminEnrollment[]>([]);
  const [adminAttendance, setAdminAttendance] = useState<AdminAttendanceRecord[]>([]);
  const [adminRooms, setAdminRooms] = useState<AdminRoom[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  useEffect(() => {
    if (isStudent) {
      PortalService.getStudentCourses().then(setCourses).catch(console.error);
      PortalService.getStudentAttendance().then(setAttendance).catch(console.error);
    }
  }, [isStudent]);

  useEffect(() => {
    if (!isParent) return;
    let cancelled = false;
    setParentLoading(true);
    setParentError(null);
    PortalService.getChildren()
      .then((data) => {
        if (cancelled) return;
        setChildren(data);
        if (!selectedChild && data.length > 0) {
          setSelectedChild(data[0].student_code);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setParentError(e instanceof Error ? e.message : "Failed to load children");
      })
      .finally(() => {
        if (cancelled) return;
        setParentLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParent]);

  useEffect(() => {
    if (!isParent) return;
    if (!selectedChild) return;
    let cancelled = false;
    setParentLoading(true);
    setParentError(null);
    PortalService.getChildAttendance(selectedChild)
      .then((data) => {
        if (cancelled) return;
        setChildAttendance(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setParentError(e instanceof Error ? e.message : "Failed to load child attendance");
      })
      .finally(() => {
        if (cancelled) return;
        setParentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isParent, selectedChild]);

  useEffect(() => {
    if (!isAdminOrSales) return;

    let cancelled = false;
    setAdminLoading(true);
    setAdminError(null);

    Promise.all([
      AdminService.listStudents(),
      AdminService.listCourses(),
      AdminService.listEnrollments(),
      AdminService.listAttendance(),
      AdminService.listRooms(),
    ])
      .then(([students, courses, enrollments, attendance, rooms]) => {
        if (cancelled) return;
        setAdminStudents(students);
        setAdminCourses(courses);
        setAdminEnrollments(enrollments);
        setAdminAttendance(attendance);
        setAdminRooms(rooms);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg =
          typeof e?.message === "string"
            ? e.message
            : typeof e === "string"
              ? e
              : "Failed to load admin dashboard data";
        setAdminError(msg);
      })
      .finally(() => {
        if (cancelled) return;
        setAdminLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdminOrSales]);

  const adminKpis = useMemo(() => {
    const activeEnrollments = adminEnrollments.filter((e) => e.status).length;
    const today = formatYmd(new Date());
    const todays = adminAttendance.filter((a) => a.attendance_date === today);
    const presentToday = todays.filter((a) => a.check_today).length;
    const attendanceRate = todays.length > 0 ? Math.round((presentToday / todays.length) * 100) : 0;
    const fullRooms = adminRooms.filter((r) => r.is_full).length;

    return {
      students: adminStudents.length,
      courses: adminCourses.length,
      enrollments: activeEnrollments,
      attendanceRate,
      rooms: adminRooms.length,
      fullRooms,
    };
  }, [adminAttendance, adminCourses, adminEnrollments, adminRooms, adminStudents]);

  const attendanceTrend = useMemo(() => {
    const days = lastNDays(7);
    const byDay: Record<string, { present: number; absent: number }> = {};
    for (const day of days) byDay[day] = { present: 0, absent: 0 };

    for (const rec of adminAttendance) {
      const d = rec.attendance_date;
      if (!byDay[d]) continue;
      if (rec.check_today) byDay[d].present += 1;
      else byDay[d].absent += 1;
    }

    return days.map((day) => ({
      day: day.slice(5),
      present: byDay[day].present,
      absent: byDay[day].absent,
    }));
  }, [adminAttendance]);

  const enrollmentsByCourse = useMemo(() => {
    const counts = new Map<string, { course: string; enrollments: number }>();
    for (const e of adminEnrollments) {
      if (!e.status) continue;
      const key = e.course_code || String(e.course_id);
      const label = e.course_name || e.course_code || `Course ${e.course_id}`;
      const cur = counts.get(key) || { course: label, enrollments: 0 };
      cur.enrollments += 1;
      counts.set(key, cur);
    }
    return Array.from(counts.values())
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 6);
  }, [adminEnrollments]);

  const roomsLoad = useMemo(() => {
    return adminRooms
      .slice()
      .sort((a, b) => (b.current_load || 0) - (a.current_load || 0))
      .slice(0, 8)
      .map((r) => ({
        room: r.room_name,
        load: r.current_load || 0,
        capacity: r.capacity,
      }));
  }, [adminRooms]);

  if (isAdminOrSales) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">Welcome back, {user?.user_code}</p>
          </div>
        </div>

        {adminError && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100">
            <div className="text-sm font-semibold text-rose-700">Couldn’t load dashboard data</div>
            <div className="text-sm text-rose-600 mt-1">{adminError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Students", val: adminKpis.students, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Courses", val: adminKpis.courses, icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-50" },
            { label: "Active Enrollments", val: adminKpis.enrollments, icon: Award, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "Rooms Full", val: `${adminKpis.fullRooms}/${adminKpis.rooms}`, icon: DoorOpen, color: "text-orange-500", bg: "bg-orange-50" },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{s.label}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{adminLoading ? "…" : s.val}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${s.bg}`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-slate-500">
                <TrendingUp className="w-4 h-4 mr-1.5 text-slate-400" />
                <span>Live from your database</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 lg:col-span-2 flex flex-col min-h-[350px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Attendance (last 7 days)</h3>
                <p className="text-sm text-slate-500 mt-1">Present vs absent, aggregated per day</p>
              </div>
              <div className="text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                Today’s rate: {adminKpis.attendanceRate}%
              </div>
            </div>
            <div className="flex-1 w-full relative min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={attendanceTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2ff" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#fff", strokeWidth: 2, stroke: "#10b981" }}
                    activeDot={{ r: 5, fill: "#10b981", stroke: "#10b981", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    name="Absent"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#fff", strokeWidth: 2, stroke: "#ef4444" }}
                    activeDot={{ r: 5, fill: "#ef4444", stroke: "#ef4444", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 flex flex-col">
            <h3 className="font-bold text-slate-900 text-lg mb-2">Top courses (enrollments)</h3>
            <p className="text-sm text-slate-500 mb-6">Active enrollments grouped by course</p>
            <div className="flex-1 min-h-[240px] relative w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={enrollmentsByCourse} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="course" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="enrollments" name="Enrollments" fill="#4f46e5" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Room load</h3>
            </div>
          </div>
          <div className="w-full h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={roomsLoad} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="room" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                <Bar dataKey="load" name="Load" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
                <Bar dataKey="capacity" name="Capacity" fill="#e2e8f0" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  if (isParent) {
    const selected = children.find((c) => c.student_code === selectedChild) || null;

    const summary = (() => {
      const total = childAttendance.length;
      const present = childAttendance.filter((r) => r.status === "Present").length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { total, present, rate };
    })();

    const trend = (() => {
      const days = lastNDays(7);
      const byDay: Record<string, number | null> = {};
      for (const d of days) byDay[d] = null;
      for (const rec of childAttendance) {
        if (!(rec.date in byDay)) continue;
        byDay[rec.date] = rec.status === "Present" ? 1 : 0;
      }
      return days.map((d) => ({ day: d.slice(5), value: byDay[d] }));
    })();

    const hasAnyInWindow = trend.some((d) => d.value !== null);

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parent Dashboard</h1>
            <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">Welcome back, {user?.user_code}</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="bg-white border border-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-500/20 outline-none text-slate-700 font-semibold"
            >
              {children.map((c) => (
                <option key={c.student_code} value={c.student_code}>
                  {c.username} ({c.student_code})
                </option>
              ))}
              {children.length === 0 && <option value="">No children linked</option>}
            </select>
          </div>
        </div>

        {parentError && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100">
            <div className="text-sm font-semibold text-rose-700">Couldn’t load data</div>
            <div className="text-sm text-rose-600 mt-1">{parentError}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Child", val: selected ? selected.username : "—", icon: UserRound, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Attendance Rate", val: `${summary.rate}%`, icon: Fingerprint, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "Records", val: summary.total, icon: Award, color: "text-indigo-500", bg: "bg-indigo-50" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{s.label}</p>
                  <h3 className="text-2xl font-bold text-slate-800 mt-1">{parentLoading ? "…" : s.val}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${s.bg}`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-slate-500">
                <TrendingUp className="w-4 h-4 mr-1.5 text-slate-400" />
                <span>From linked child activity</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Attendance (last 7 days)</h3>
              <p className="text-sm text-slate-500 mt-1">1 = present, 0 = absent</p>
            </div>
            <div className="text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              Present: {summary.present}/{summary.total}
            </div>
          </div>
          {!hasAnyInWindow ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
              No attendance records in the last 7 days.
            </div>
          ) : (
            <div className="flex-1 w-full relative min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2ff" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} allowDecimals={false} domain={[0, 1]} />
                  <Tooltip
                    formatter={(v) => {
                      if (v === null || typeof v === "undefined") return ["No record", "Attendance"];
                      return [v, "Attendance"];
                    }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                  />
                  <Bar dataKey="value" name="Attendance" fill="#10b981" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
            Welcome back, {user?.user_code}
          </p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Enrolled Courses", val: courses.length, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Attendance Rate", val: `${attendance?.summary?.attendance_rate || 0}%`, icon: Fingerprint, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Avg. Grade", val: "B+", icon: Award, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Active Semesters", val: "2", icon: Users, color: "text-orange-500", bg: "bg-orange-50" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">{s.label}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{s.val}</h3>
              </div>
              <div className={`p-3 rounded-2xl ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              <span>+12% from last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 lg:col-span-2 flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-lg">Activity Overview</h3>
            <select className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500/20 outline-none text-slate-600 font-medium cursor-pointer">
              <option>Monthly</option>
              <option>Weekly</option>
            </select>
          </div>
          <div className="flex-1 w-full relative min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={studentChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={15} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{stroke: '#e2e8f0', strokeWidth: 1}}
                />
                <Line 
                  type="monotone" 
                  dataKey="pv" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={{r: 4, fill: '#fff', strokeWidth: 2, stroke: '#4f46e5'}} 
                  activeDot={{ r: 6, fill: "#4f46e5", stroke: "#4f46e5", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Courses Sidebar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 flex flex-col">
          <h3 className="font-bold text-slate-900 text-lg mb-6">Popular Skills</h3>
          <div className="flex-1 flex flex-col gap-5 justify-center">
            {[
              { label: "UI/UX Design", val: "80%", color: "bg-blue-600" },
              { label: "Web Development", val: "65%", color: "bg-indigo-600" },
              { label: "Cyber Security", val: "45%", color: "bg-emerald-500" },
              { label: "Machine Learning", val: "30%", color: "bg-purple-500" },
            ].map((p, j) => (
              <div key={j}>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-slate-700">{p.label}</span>
                  <span className="text-slate-400">{p.val}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-2.5 rounded-full ${p.color} transition-all duration-1000 ease-out`} style={{ width: p.val }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>

      {/* Recent Enrollments Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-900 text-lg">Your Enrollments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Course Name</th>
                <th className="px-6 py-4">Enroll Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {courses.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                      {c.course.course_name[0]}
                    </div>
                    {c.course.course_name}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {c.enrollment_date.split(" ")[0]}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-medium">
                    No enrollments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
