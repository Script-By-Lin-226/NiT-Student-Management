"use client";

import { useEffect, useMemo, useState } from "react";
import { Child, PortalService, StudentCourse, StudentAttendance } from "@/services/portal.service";
import { useAuth } from "@/hooks/useAuth";
import { AdminAttendanceRecord, AdminCourse, AdminEnrollment, AdminRoom, AdminService, AdminStudent } from "@/services/admin.service";
import { Users, BookOpen, Fingerprint, Award, TrendingUp, CheckCircle2, DoorOpen, UserRound } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { StatisticSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";

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
  const [selectedChild, setSelectedChild] = useState<string>("");
  const { admin, parent, student } = useDashboardData(selectedChild);

  // Sync selectedChild when parent data arrives
  useEffect(() => {
    if (isParent && parent.children.length > 0 && !selectedChild) {
      setSelectedChild(parent.children[0].student_code);
    }
  }, [isParent, parent.children, selectedChild]);

  const dashboardLoading = (typeof admin.isLoading === 'boolean' ? admin.isLoading : admin.isLoading.overall) || parent.isLoading || student.isLoading;
  const dashboardError = admin.error || parent.error || student.error;

  const {
    totalStudents = 0,
    totalCourses = 0,
    enrollments: adminEnrollments = [],
    attendance: adminAttendance = [],
    rooms: adminRooms = [],
    today_attendance_count = 0,
  } = admin.data || {};

  const courses = student.courses;
  const attendance = student.attendance;
  const children = parent.children;
  const childAttendance = parent.childAttendance;

  const adminKpis = useMemo(() => {
    const activeEnrollments = adminEnrollments.filter((e) => e.status).length;
    const today = formatYmd(new Date());
    const todays = adminAttendance.filter((a) => a.attendance_date === today);
    const presentToday = todays.filter((a) => a.check_today).length;
    const attendanceRate = todays.length > 0 ? Math.round((presentToday / todays.length) * 100) : 0;
    const fullRooms = adminRooms.filter((r) => r.is_full).length;

    return {
      students: totalStudents,
      courses: totalCourses,
      enrollments: adminEnrollments.length, // Already filtered by status=true in hook
      attendanceRate,
      rooms: adminRooms.length,
      fullRooms,
    };
  }, [adminAttendance, totalCourses, adminEnrollments, adminRooms, totalStudents]);

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

        {dashboardError && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100">
            <div className="text-sm font-semibold text-rose-700">Couldn’t load dashboard data</div>
            <div className="text-sm text-rose-600 mt-1">{String(dashboardError)}</div>
          </div>
        )}

        {dashboardLoading && (typeof admin.isLoading === 'boolean' || admin.isLoading.overall) && (
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 opacity-0 pointer-events-none absolute">
             {/* Skeletons are now handled per-card below for better UX */}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Students", val: adminKpis.students, icon: Users, color: "text-blue-500", bg: "bg-blue-50", loadingKey: 'students' },
            { label: "Courses", val: adminKpis.courses, icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-50", loadingKey: 'courses' },
            { label: "Active Enrollments", val: adminKpis.enrollments, icon: Award, color: "text-emerald-500", bg: "bg-emerald-50", loadingKey: 'enrollments' },
            { label: "Rooms Full", val: `${adminKpis.fullRooms}/${adminKpis.rooms}`, icon: DoorOpen, color: "text-orange-500", bg: "bg-orange-50", loadingKey: 'rooms' },
          ].map((s, i) => {
            const isIndividualLoading = typeof admin.isLoading !== 'boolean' && admin.isLoading[s.loadingKey as keyof typeof admin.isLoading];
            if (isIndividualLoading) return <StatisticSkeleton key={i} />;
            
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{s.label}</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{s.val}</h3>
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
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 lg:col-span-2 flex flex-col min-h-[350px]">
            {typeof admin.isLoading !== 'boolean' && admin.isLoading.attendance ? (
              <ChartSkeleton />
            ) : (
              <>
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
                        strokeWidth={4}
                        dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#10b981" }}
                        activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="absent"
                        name="Absent"
                        stroke="#ef4444"
                        strokeWidth={4}
                        dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#ef4444" }}
                        activeDot={{ r: 6, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 flex flex-col min-h-[350px]">
            {typeof admin.isLoading !== 'boolean' && admin.isLoading.enrollments ? (
              <ChartSkeleton />
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 min-h-[350px]">
          {typeof admin.isLoading !== 'boolean' && admin.isLoading.rooms ? (
            <ChartSkeleton />
          ) : (
            <>
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
            </>
          )}
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
      const byDay: Record<string, { present: number; total: number }> = {};
      for (const d of days) byDay[d] = { present: 0, total: 0 };
      
      for (const rec of childAttendance) {
        if (!(rec.date in byDay)) continue;
        byDay[rec.date].total += 1;
        if (rec.status === "Present") byDay[rec.date].present += 1;
      }
      return days.map((d) => {
        const rate = byDay[d].total > 0 ? Math.round((byDay[d].present / byDay[d].total) * 100) : null;
        return { 
          day: d.slice(5), 
          rate: rate,
          present: byDay[d].present,
          total: byDay[d].total
        };
      });
    })();

    const pieData = [
      { name: "Present", value: summary.present, color: "#10b981" },
      { name: "Absent", value: summary.total - summary.present, color: "#ef4444" },
    ];

    const hasAnyInWindow = trend.some((d) => d.total > 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-outfit">Parent Portal</h1>
            <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">Monitoring progress for your children</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="bg-white border border-slate-200 text-sm rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-brand-500/10 outline-none text-slate-700 font-bold shadow-sm transition-all cursor-pointer hover:border-brand-300"
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

        {dashboardError && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100 flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <div className="p-2 bg-rose-50 rounded-full">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-700">Heads up!</div>
              <div className="text-sm text-rose-600 font-medium">{String(dashboardError)}</div>
            </div>
          </div>
        )}

        {dashboardLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatisticSkeleton />
              <StatisticSkeleton />
              <StatisticSkeleton />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <UserRound className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Linked Student</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{selected ? selected.username : "—"}</h3>
              <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {selected?.student_code || "N/A"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase">Real-time</div>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{`${summary.rate}%`}</h3>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${summary.rate}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Award className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Records</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{summary.total}</h3>
              <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                Across all registered courses
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 p-8 lg:col-span-2 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Attendance Trend</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Daily attendance percentage (last 7 days)</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-500">Rate</span>
                </div>
              </div>
            </div>
            
            {!hasAnyInWindow ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="p-4 bg-slate-50 rounded-3xl">
                  <div className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold">No data found within this period</p>
              </div>
            ) : (
              <div className="flex-1 w-full relative min-h-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }} 
                      dy={15} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }} 
                      domain={[0, 100]}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "20px",
                        border: "none",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                        padding: "12px 16px"
                      }}
                      itemStyle={{ fontWeight: 800 }}
                      labelStyle={{ marginBottom: "4px", color: "#64748b", fontWeight: 700 }}
                      cursor={{ stroke: "#10b981", strokeWidth: 2, strokeDasharray: "5 5" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      name="Attendance Rate"
                      stroke="#10b981"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorRate)"
                      dot={{ r: 6, fill: "#fff", strokeWidth: 3, stroke: "#10b981" }}
                      activeDot={{ r: 8, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 p-8 flex flex-col items-center">
            <div className="w-full mb-6">
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Summary</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Overall distribution</p>
            </div>
            
            <div className="flex-1 w-full relative min-h-[250px] flex items-center justify-center">
              {summary.total === 0 ? (
                <p className="text-slate-400 font-bold">No records</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                       itemStyle={{ fontWeight: 800 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {summary.total > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-800">{summary.rate}%</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Present</span>
                </div>
              )}
            </div>

            <div className="w-full grid grid-cols-2 gap-4 mt-6">
              <div className="bg-emerald-50 rounded-2xl p-4 text-center">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Present</p>
                <p className="text-xl font-black text-emerald-700">{summary.present}</p>
              </div>
              <div className="bg-rose-50 rounded-2xl p-4 text-center">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Absent</p>
                <p className="text-xl font-black text-rose-700">{summary.total - summary.present}</p>
              </div>
            </div>
          </div>
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

      {/* Recent Enrollments Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-900 text-lg">Your Enrollments</h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
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

        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {courses.map((c, i) => (
            <div key={i} className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                    {c.course.course_name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 leading-tight">{c.course.course_name}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">Enrolled: {c.enrollment_date.split(" ")[0]}</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" />
                  {c.status}
                </span>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              No enrollments found.
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
