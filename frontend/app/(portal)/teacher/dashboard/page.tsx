"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  PortalService,
  TeacherClassInfo,
  TeacherDailyHours,
  TeacherBatchAttendance,
} from "@/services/portal.service";
import {
  BookOpen,
  Clock,
  GraduationCap,
  ChevronRight,
  Users,
  MapPin,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { StatisticSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

export default function TeacherDashboardPage() {
  const { user } = useAuth();

  const [totalClasses, setTotalClasses] = useState<number>(0);
  const [dailyHours, setDailyHours] = useState<TeacherDailyHours | null>(null);
  const [totalSubjects, setTotalSubjects] = useState<number>(0);
  const [batchAttendance, setBatchAttendance] = useState<TeacherBatchAttendance[]>([]);
  const [assignments, setAssignments] = useState<TeacherClassInfo[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const [classes, hours, subjects] = await Promise.all([
          PortalService.getTeacherTotalClasses(),
          PortalService.getTeacherDailyHours(),
          PortalService.getTeacherTotalSubjects(),
        ]);
        setTotalClasses(classes);
        setDailyHours(hours);
        setTotalSubjects(subjects);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load stats");
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch chart data (attendance per batch)
  useEffect(() => {
    const fetchChart = async () => {
      try {
        setLoadingChart(true);
        const data = await PortalService.getTeacherAttendancePerBatch();
        setBatchAttendance(data);
      } catch (e: any) {
        console.error("Chart data error", e);
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, []);

  // Fetch assignments (classes)
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoadingClasses(true);
        const data = await PortalService.getTeacherAssignments();
        setAssignments(data);
      } catch (e: any) {
        console.error("Assignments error", e);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchAssignments();
  }, []);




  // Chart data: attendance rate per batch
  const chartData = batchAttendance.map((b) => ({
    batch: `Batch ${b.batch_no}`,
    rate: b.attendance_rate,
    present: b.present_count,
    total: b.total_records,
  }));

  // Deterministic color palette for batch bars
  const batchColors = ["#10b981", "#34d399", "#6ee7b7", "#059669", "#047857", "#a7f3d0"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome {user?.username || `Tr ${user?.user_code}`} !
        </h1>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Manage your classes and student grades here.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100">
          <div className="text-sm font-semibold text-rose-700">
            Couldn&apos;t load dashboard data
          </div>
          <div className="text-sm text-rose-600 mt-1">{error}</div>
        </div>
      )}

      {/* Stats Cards - matching reference: Total Classes, Daily Teaching Hour, Total Subjects */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loadingStats ? (
          <>
            <StatisticSkeleton />
            <StatisticSkeleton />
            <StatisticSkeleton />
          </>
        ) : (
          <>
            {/* Total Classes */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50/40 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125" />
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100/60">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Classes
                  </p>
                  <h3 className="text-3xl font-black text-slate-800 mt-0.5 tabular-nums">
                    {totalClasses}
                  </h3>
                </div>
              </div>
            </div>

            {/* Daily Teaching Hour */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125" />
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/60">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Daily Teaching Hour
                  </p>
                  <h3 className="text-3xl font-black text-slate-800 mt-0.5 tabular-nums">
                    {dailyHours?.total_hours ?? 0}
                  </h3>
                </div>
              </div>
            </div>

            {/* Total Subjects */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50/40 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125" />
              <div className="relative flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100/60">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Subjects
                  </p>
                  <h3 className="text-3xl font-black text-slate-800 mt-0.5 tabular-nums">
                    {totalSubjects}
                  </h3>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Attendance Per Batch Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6 flex flex-col min-h-[380px]">
        {loadingChart ? (
          <ChartSkeleton />
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Attendance per Batch
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Attendance rate (%) for each of your batches
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-500">Attendance Rate (%)</span>
              </div>
            </div>
            <div className="w-full" style={{ height: 280 }}>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-bold text-sm">No attendance data available</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="batch"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: any, _name: any, props: any) => [
                        `${value}% (${props?.payload?.present ?? 0}/${props?.payload?.total ?? 0})`,
                        "Attendance Rate",
                      ]}
                    />
                    <Bar
                      dataKey="rate"
                      name="Attendance Rate"
                      radius={[10, 10, 0, 0]}
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={batchColors[index % batchColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>

      {/* Classes Section — Divided by Subject */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900 text-xl">Classes</h3>
          <Link
            href="/teacher/classes"
            className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingClasses ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-4" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-8 bg-slate-200 rounded-xl w-full mt-4" />
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-10 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-bold text-slate-500">No classes assigned yet</p>
          </div>
        ) : (() => {
          // Build unique subject cards from assignments
          const subjectCardMap = new Map<string, {
            subject_name: string;
            subject_id: number | null;
            course_name: string;
            course_code: string;
            course_id: number;
            batches: string[];
            total_students: number;
            schedules: { day_of_week: string | null; start_time: string | null; end_time: string | null; room: string | null; batch_no: string | null }[];
          }>();

          assignments.forEach((a) => {
            const subjectKey = `${a.course_id}-${a.subject_id ?? "no-subject"}`;
            if (!subjectCardMap.has(subjectKey)) {
              subjectCardMap.set(subjectKey, {
                subject_name: a.subject_name || "General",
                subject_id: a.subject_id,
                course_name: a.course_name,
                course_code: a.course_code,
                course_id: a.course_id,
                batches: [],
                total_students: 0,
                schedules: [],
              });
            }
            const card = subjectCardMap.get(subjectKey)!;
            if (a.batch_no && !card.batches.includes(a.batch_no)) {
              card.batches.push(a.batch_no);
            }
            card.total_students = Math.max(card.total_students, a.total_students);
            if (a.start_time && a.end_time) {
              const alreadyAdded = card.schedules.some(
                (s) => s.day_of_week === a.day_of_week && s.start_time === a.start_time && s.end_time === a.end_time
              );
              if (!alreadyAdded) {
                card.schedules.push({
                  day_of_week: a.day_of_week,
                  start_time: a.start_time,
                  end_time: a.end_time,
                  room: a.room,
                  batch_no: a.batch_no,
                });
              }
            }
          });

          const subjectCards = Array.from(subjectCardMap.values());

          // Accent color palette for subject differentiation
          const subjectAccents = [
            { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", dot: "bg-indigo-500", iconBg: "bg-indigo-100", tag: "bg-indigo-600" },
            { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100", dot: "bg-emerald-500", iconBg: "bg-emerald-100", tag: "bg-emerald-600" },
            { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100", dot: "bg-amber-500", iconBg: "bg-amber-100", tag: "bg-amber-600" },
            { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100", dot: "bg-rose-500", iconBg: "bg-rose-100", tag: "bg-rose-600" },
            { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-100", dot: "bg-cyan-500", iconBg: "bg-cyan-100", tag: "bg-cyan-600" },
            { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100", dot: "bg-violet-500", iconBg: "bg-violet-100", tag: "bg-violet-600" },
            { bg: "bg-fuchsia-50", text: "text-fuchsia-600", border: "border-fuchsia-100", dot: "bg-fuchsia-500", iconBg: "bg-fuchsia-100", tag: "bg-fuchsia-600" },
            { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100", dot: "bg-teal-500", iconBg: "bg-teal-100", tag: "bg-teal-600" },
          ];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectCards.slice(0, 9).map((card, idx) => {
                const accent = subjectAccents[idx % subjectAccents.length];
                const primarySchedule = card.schedules[0] || null;

                return (
                  <div
                    key={`${card.course_id}-${card.subject_id ?? "gen"}`}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100/50 group hover:shadow-lg hover:border-brand-200 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    {/* Subject Color Bar */}
                    <div className={`h-1.5 ${accent.tag}`} />

                    <div className="p-5 flex flex-col flex-1">
                      {/* Subject Title */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${accent.iconBg} flex items-center justify-center shrink-0`}>
                          <GraduationCap className={`w-5 h-5 ${accent.text}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-800 text-base leading-snug truncate">
                            {card.subject_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black ${accent.bg} ${accent.text} px-2 py-0.5 rounded-md uppercase tracking-wider ${accent.border} border`}>
                              {card.course_code}
                            </span>
                            <span className="text-xs text-slate-400 font-medium truncate">
                              {card.course_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="space-y-1.5 text-xs text-slate-500 font-medium mb-4">
                        {primarySchedule ? (
                          <>
                            <p className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {primarySchedule.start_time} – {primarySchedule.end_time}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                              {primarySchedule.day_of_week || "Not scheduled"}
                              {primarySchedule.batch_no && (
                                <span className="text-slate-400">
                                  {" "}· {primarySchedule.batch_no}
                                </span>
                              )}
                            </p>
                            {primarySchedule.room && (
                              <p className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {primarySchedule.room}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-400 italic">
                            Schedule not set
                          </p>
                        )}
                        <p className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {card.total_students} students
                        </p>
                      </div>

                      {/* Batch Tags */}
                      <div className="mt-auto flex flex-wrap gap-2">
                        {card.batches.length > 0 ? (
                          card.batches.map((batch) => (
                            <span
                              key={batch}
                              className={`text-xs font-bold ${accent.tag} text-white px-3 py-1.5 rounded-xl shadow-sm`}
                            >
                              {batch}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl">
                            No batch
                          </span>
                        )}
                        {card.schedules.length > 1 && (
                          <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl">
                            +{card.schedules.length - 1} more slots
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
