"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { Child, PortalService, StudentCourse, StudentAttendance } from "@/services/portal.service";
import { useAuth } from "@/hooks/useAuth";
import { AdminAttendanceRecord, AdminCourse, AdminEnrollment, AdminRoom, AdminService, AdminStudent } from "@/services/admin.service";
import { Users, BookOpen, Fingerprint, Award, TrendingUp, CheckCircle2, DoorOpen, UserRound, ChevronLeft, ChevronRight, X, Eye, Landmark, Loader2, Download, CreditCard } from "lucide-react";
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
import { formatAmount, getExtraItemNames, getExtraItemPrices, getExtraItemMethods } from "@/utils/format";
import { exportToExcel } from "@/utils/excelExport";
import { generateIncomeReportPDF } from "@/utils/pdfIncomeReport";
import clsx from "clsx";

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

const renderExtraItemsCell = (payment: any) => {
  const itemsStr = payment.extra_items || "";
  let list: { name: string; price: number; method: string }[] = [];
  if (itemsStr.startsWith("[") && itemsStr.endsWith("]")) {
    try {
      const parsed = JSON.parse(itemsStr);
      if (Array.isArray(parsed)) {
        list = parsed.map((it: any) => ({
          name: it.name || "",
          price: Number(it.price) || 0,
          method: it.method || ""
        }));
      }
    } catch {}
  }

  if (list.length === 0 && payment.extra_items_fee) {
    list = [{
      name: payment.extra_items || "Extra Item",
      price: payment.extra_items_fee,
      method: payment.extra_items_payment_method || payment.payment_method || ""
    }];
  }

  if (list.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="flex flex-col gap-1 text-right items-end font-semibold">
      {list.map((item, idx) => (
        <div key={idx} className="text-[11px] leading-tight">
          <span className="text-slate-800 font-bold">{item.name}</span>{" "}
          <span className="text-slate-500 font-normal text-nowrap">
            ({formatAmount(item.price)} MMK - {item.method})
          </span>
        </div>
      ))}
      {list.length > 1 && (
        <div className="text-[10px] font-black text-slate-400 border-t border-slate-100 pt-0.5 mt-0.5">
          Total: {formatAmount(payment.extra_items_fee || 0)} MMK
        </div>
      )}
    </div>
  );
};

export default function DashboardPage() {
  const { isStudent, isParent, isAdminOrSales, isAdmin, user, isStudentAffairs } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [childPage, setChildPage] = useState<number>(1);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<any | null>(null);
  const { admin, parent, student } = useDashboardData(selectedChild, childPage);

  // Accountant dashboard state
  const isAccountant = user?.role === "accountant";
  const [activeFilter, setActiveFilter] = useState<"day" | "week" | "month" | "all">("all");
  const [accStartDate, setAccStartDate] = useState("");
  const [accEndDate, setAccEndDate] = useState("");
  const [accIncomeReport, setAccIncomeReport] = useState<any>(null);
  const [accLoading, setAccLoading] = useState(false);
  const [accTrendType, setAccTrendType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [accIncomeCurrency, setAccIncomeCurrency] = useState<"MMK" | "GBP">("MMK");

  const getDateRangeForFilter = (filter: "day" | "week" | "month" | "all") => {
    const today = new Date();
    let start = "";
    let end = "";
    
    const formatLocalYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (filter === "day") {
      start = formatLocalYmd(today);
      end = formatLocalYmd(today);
    } else if (filter === "week") {
      const currentDay = today.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today);
      monday.setDate(today.getDate() + distanceToMonday);
      start = formatLocalYmd(monday);
      end = formatLocalYmd(today);
    } else if (filter === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatLocalYmd(firstDay);
      end = formatLocalYmd(today);
    }
    return { start, end };
  };

  const handleAccFilterSelect = (filter: "day" | "week" | "month" | "all") => {
    setActiveFilter(filter);
    const { start, end } = getDateRangeForFilter(filter);
    setAccStartDate(start);
    setAccEndDate(end);
  };

  const fetchAccDashboardData = async () => {
    if (!isAccountant) return;
    setAccLoading(true);
    try {
      const report = await AdminService.getIncomeReport(accStartDate || undefined, accEndDate || undefined);
      setAccIncomeReport(report);
    } catch (err) {
      console.error("Failed to load accountant dashboard data", err);
    } finally {
      setAccLoading(false);
    }
  };

  useEffect(() => {
    if (isAccountant) {
      fetchAccDashboardData();
    }
  }, [isAccountant, accStartDate, accEndDate]);

  const accIncomeTrendData = useMemo(() => {
    if (!accIncomeReport) return [];
    if (accTrendType === "daily") return accIncomeReport.daily_stats;
    if (accTrendType === "monthly") return accIncomeReport.monthly_stats;
    return accIncomeReport.weekly_stats;
  }, [accIncomeReport, accTrendType]);

  const handleExportIncomeReport = () => {
    if (!accIncomeReport) return;
    const formattedRecords: any[] = [];
    const methodTotals: Record<string, number> = {};
    const addAmount = (method: string | null | undefined, amount: number) => {
      if (!amount || amount <= 0) return;
      const m = (method || "Unknown").trim();
      methodTotals[m] = (methodTotals[m] || 0) + amount;
    };

    for (const r of accIncomeReport.payment_records) {
      if (r.amount_2 && r.amount_2 > 0) {
        // Record 1: Primary Payment
        formattedRecords.push({
          ID: r.payment_id,
          Date: r.payment_date ? r.payment_date.split("T")[0] : "—",
          Student_Name: r.student_name || "N/A",
          Course_Name: r.course_name || "N/A",
          Amount_MMK: r.amount,
          Extra_Fee_MMK: r.extra_items_fee || 0,
          Extra_Items_Name: getExtraItemNames(r.extra_items),
          Extra_Items_Price_MMK: getExtraItemPrices(r.extra_items, r.extra_items_fee),
          Extra_Items_Payment_Method: getExtraItemMethods(r.extra_items, r.extra_items_payment_method),
          Fine_MMK: r.fine_amount || 0,
          Discount_MMK: r.discount_amount || 0,
          ExamFee_GBP: r.exam_fee_paid_gbp || 0,
          ExamFee_MMK: r.exam_fee_paid_mmk || 0,
          Tuition_Payment_Method: r.payment_method || "—",
          Status: r.status
        });
        // Record 2: Secondary Split Payment
        formattedRecords.push({
          ID: `${r.payment_id} (Split)`,
          Date: r.payment_date ? r.payment_date.split("T")[0] : "—",
          Student_Name: r.student_name || "N/A",
          Course_Name: r.course_name || "N/A",
          Amount_MMK: r.amount_2,
          Extra_Fee_MMK: 0,
          Extra_Items_Name: "—",
          Extra_Items_Price_MMK: 0,
          Extra_Items_Payment_Method: "—",
          Fine_MMK: 0,
          Discount_MMK: 0,
          ExamFee_GBP: 0,
          ExamFee_MMK: 0,
          Tuition_Payment_Method: r.payment_method_2 || "—",
          Status: r.status
        });
      } else {
        formattedRecords.push({
          ID: r.payment_id,
          Date: r.payment_date ? r.payment_date.split("T")[0] : "—",
          Student_Name: r.student_name || "N/A",
          Course_Name: r.course_name || "N/A",
          Amount_MMK: r.amount,
          Extra_Fee_MMK: r.extra_items_fee || 0,
          Extra_Items_Name: getExtraItemNames(r.extra_items),
          Extra_Items_Price_MMK: getExtraItemPrices(r.extra_items, r.extra_items_fee),
          Extra_Items_Payment_Method: getExtraItemMethods(r.extra_items, r.extra_items_payment_method),
          Fine_MMK: r.fine_amount || 0,
          Discount_MMK: r.discount_amount || 0,
          ExamFee_GBP: r.exam_fee_paid_gbp || 0,
          ExamFee_MMK: r.exam_fee_paid_mmk || 0,
          Tuition_Payment_Method: r.payment_method || "—",
          Status: r.status
        });
      }

      addAmount(r.payment_method, r.amount || 0);
      addAmount(r.payment_method_2, r.amount_2 || 0);
      addAmount(r.payment_method, r.fine_amount || 0);
      addAmount(r.exam_fee_payment_method || r.payment_method, r.exam_fee_paid_mmk || 0);
      
      const itemsStr = r.extra_items || "";
      let itemsParsed = false;
      if (itemsStr.startsWith("[") && itemsStr.endsWith("]")) {
        try {
          const parsed = JSON.parse(itemsStr);
          if (Array.isArray(parsed)) {
            itemsParsed = true;
            for (const it of parsed) {
              addAmount(it.method || r.extra_items_payment_method || r.payment_method, Number(it.price) || 0);
            }
          }
        } catch {}
      }
      if (!itemsParsed && r.extra_items_fee > 0) {
        addAmount(r.extra_items_payment_method || r.payment_method, r.extra_items_fee || 0);
      }
    }

    const summaryRecords = Object.entries(methodTotals).map(([method, total]) => ({
      "Payment Method": method,
      "Total Amount (MMK)": total
    }));

    exportToExcel(
      {
        "Payments Audit Log": formattedRecords,
        "Method Summary": summaryRecords
      },
      "Accountant_Income_Report"
    );
  };

  const handleExportIncomeReportPDF = () => {
    if (!accIncomeReport) return;
    const dateRangeStr = (accStartDate || accEndDate) ? `${accStartDate || 'Start'} to ${accEndDate || 'End'}` : "All Time";
    generateIncomeReportPDF(
      "daily",
      accIncomeReport.daily_stats || [],
      dateRangeStr,
      user?.username || "Accountant",
      accIncomeReport.payment_records
    );
  };

  // Redirect teachers to their dedicated dashboard
  useEffect(() => {
    if (user?.role === "teacher") {
      window.location.href = "/teacher/dashboard";
    }
  }, [user]);

  // Sync selectedChild when parent data arrives
  useEffect(() => {
    if (isParent && parent.children.length > 0 && !selectedChild) {
      setSelectedChild(parent.children[0].student_code);
    }
  }, [isParent, parent.children, selectedChild]);

  // Reset page when child changes
  useEffect(() => {
    setChildPage(1);
    setSelectedPaymentDetails(null);
  }, [selectedChild]);

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

  if (isAccountant) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        {/* Header section */}
        <div className="bg-white rounded-3xl border border-slate-100/50 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Landmark className="w-7 h-7 text-brand-600" />
              Accountant Dashboard
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Welcome back, {user?.user_code || "Accountant"}
            </p>
          </div>

          {/* Quick Date Range Filters for the Accountant Dashboard */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Preset Date Filters */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              {(["day", "week", "month", "all"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleAccFilterSelect(filter)}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer",
                    activeFilter === filter
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <input 
                type="date" 
                value={accStartDate} 
                onChange={(e) => { setAccStartDate(e.target.value); setActiveFilter("all"); }}
                className="bg-transparent text-xs font-semibold px-2 py-1 focus:outline-none text-slate-700" 
              />
              <span className="text-xs text-slate-400 font-bold px-1">to</span>
              <input 
                type="date" 
                value={accEndDate} 
                onChange={(e) => { setAccEndDate(e.target.value); setActiveFilter("all"); }}
                className="bg-transparent text-xs font-semibold px-2 py-1 focus:outline-none text-slate-700" 
              />
              {(accStartDate || accEndDate) && (
                <button 
                  onClick={() => { setAccStartDate(""); setAccEndDate(""); setActiveFilter("all"); }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {accLoading && (
          <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-100/50">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        )}

        {!accLoading && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Income (MMK)</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {formatAmount(accIncomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.amount || 0) + (r.extra_items_fee || 0) + (r.fine_amount || 0), 0) || 0)}
                </div>
                <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5 mt-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Tuition + Extras
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Exam Fees (GBP)</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  £{(accIncomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.exam_fee_paid_gbp || 0), 0) || 0).toFixed(2)}
                </div>
                <span className="text-[10px] font-semibold text-indigo-500 flex items-center gap-0.5 mt-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Exam registration
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Fines Collected (MMK)</span>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {formatAmount(accIncomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.fine_amount || 0), 0) || 0)}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-2 block">Late payment penalties</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Extra Fee Received</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {formatAmount(accIncomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.extra_items_fee || 0), 0) || 0)} <span className="text-xs font-normal">MMK</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-2 block">Uniforms, books, badges</span>
              </div>
            </div>

            {/* Income charts & trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Income Trend</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={accTrendType}
                      onChange={(e: any) => setAccTrendType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-2 py-1.5 focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <select
                      value={accIncomeCurrency}
                      onChange={(e: any) => setAccIncomeCurrency(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-2 py-1.5 focus:outline-none"
                    >
                      <option value="MMK">MMK</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="w-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={accIncomeTrendData}>
                      <defs>
                        <linearGradient id="colorAccInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={accIncomeCurrency === "MMK" ? "#4f46e5" : "#0d9488"} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={accIncomeCurrency === "MMK" ? "#4f46e5" : "#0d9488"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey={accIncomeCurrency === "MMK" ? "total_mmk" : "total_gbp"} 
                        name={accIncomeCurrency === "MMK" ? "MMK Income" : "GBP Income"} 
                        stroke={accIncomeCurrency === "MMK" ? "#4f46e5" : "#0d9488"} 
                        fillOpacity={1} 
                        fill="url(#colorAccInc)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Fee category breakdown card */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">Fee category breakdown (MMK)</h3>
                
                {accIncomeReport && (
                  <div className="space-y-4">
                    {[
                      { 
                        name: "Tuition Fees", 
                        val: accIncomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0,
                        color: "bg-indigo-600"
                      },
                      { 
                        name: "Exam Fees (MMK equivalent)", 
                        val: accIncomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.exam_fee_paid_mmk || 0), 0) || 0,
                        color: "bg-teal-600"
                      },
                      { 
                        name: "Fines & Penalties", 
                        val: accIncomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.fine_amount || 0), 0) || 0,
                        color: "bg-amber-600"
                      },
                      { 
                        name: "Extra Items & Materials", 
                        val: accIncomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.extra_items_fee || 0), 0) || 0,
                        color: "bg-pink-600"
                      }
                    ].map((item, idx) => {
                      const totalMmk = accIncomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.amount || 0) + (r.extra_items_fee || 0) + (r.fine_amount || 0) + (r.exam_fee_paid_mmk || 0), 0) || 1;
                      const percentage = Math.round((item.val / totalMmk) * 100) || 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="text-slate-800">{formatAmount(item.val)} MMK ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={clsx("h-2 rounded-full", item.color)} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Income Transactions Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                  Payments Transaction Audit Log
                </h3>
                {accIncomeReport?.payment_records?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportIncomeReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                    >
                      <Download className="w-4 h-4" /> Export Excel
                    </button>
                    <button
                      onClick={handleExportIncomeReportPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all border border-indigo-200"
                    >
                      <Download className="w-4 h-4" /> Export PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Student / Course</th>
                      <th className="px-6 py-3 text-right">Tuition (MMK)</th>
                      <th className="px-6 py-3 text-right">Extra Items (MMK)</th>
                      <th className="px-6 py-3 text-right">Fines (MMK)</th>
                      <th className="px-6 py-3 text-right">Exam Paid (GBP)</th>
                      <th className="px-6 py-3 text-right">Exam Paid (MMK)</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {!accIncomeReport?.payment_records || accIncomeReport.payment_records.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-8 text-center text-slate-400 font-medium">
                          No payments recorded in the selected period.
                        </td>
                      </tr>
                    ) : (
                      accIncomeReport.payment_records.map((payment: any) => (
                        <tr key={payment.payment_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3 font-bold text-slate-800">#P{payment.payment_id}</td>
                          <td className="px-6 py-3">{payment.payment_date ? payment.payment_date.split("T")[0] + " " + payment.payment_date.split("T")[1]?.slice(0, 8) : "—"}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600">
                            <div className="font-bold text-slate-800">{payment.student_name || "N/A"}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{payment.course_name || "N/A"}</div>
                          </td>
                          <td className="px-6 py-3 text-right font-semibold text-slate-900">{formatAmount(payment.amount)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-slate-900">{renderExtraItemsCell(payment)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-rose-600">+{formatAmount(payment.fine_amount || 0)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-indigo-700">£{(payment.exam_fee_paid_gbp || 0).toFixed(2)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-slate-900">{formatAmount(payment.exam_fee_paid_mmk || 0)}</td>
                          <td className="px-6 py-3 font-bold text-slate-500">{payment.payment_method}</td>
                          <td className="px-6 py-3">
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wide",
                              payment.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-700"
                            )}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (isAdminOrSales || isStudentAffairs) {
    const getGreeting = () => {
      const hr = new Date().getHours();
      if (hr < 12) return "Good Morning";
      if (hr < 17) return "Good Afternoon";
      return "Good Evening";
    };

    const dashboardTitle = () => {
      if (user?.role === "admin") return "Admin Dashboard";
      if (user?.role === "manager") return "Manager Portal Dashboard";
      if (user?.role === "sales") return "Sales Portal Dashboard";
      if (user?.role === "student_affairs") return "Student Affairs Dashboard";
      return "Operations Dashboard";
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        
        {/* Modern Dynamic Header Panel
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 p-6 md:p-8 shadow-xl shadow-brand-500/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-brand-500/20 rounded-full blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Database
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-3 font-outfit">
                {getGreeting()}, {user?.username || user?.user_code}
              </h1>
              <p className="text-white/80 font-medium text-sm md:text-base mt-2">
                Welcome to your {dashboardTitle()}. Here is an overview of the academy's current metrics.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-brand-600 shadow-inner">
                {user?.role?.[0]?.toUpperCase() || "S"}
              </div>
              <div>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-none">Logged in as</p>
                <p className="text-sm font-bold text-white uppercase mt-1 tracking-wider">{user?.role}</p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Quick Operations Panel */}
        {/* <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Quick Operations Panel</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Common administrative tasks and directory actions</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Students", desc: "View & Add", href: "/admin/students", icon: Users, color: "from-blue-500 to-indigo-500", text: "text-blue-600", bg: "bg-blue-50" },
              { label: "Attendance", desc: "Record Daily", href: "/admin/attendance", icon: Fingerprint, color: "from-emerald-500 to-teal-500", text: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Payments", desc: "Record Fees", href: "/admin/payments", icon: CreditCard, color: "from-purple-500 to-pink-500", text: "text-purple-600", bg: "bg-purple-50" },
              { label: "Enrollments", desc: "New Student", href: "/admin/enrollments", icon: Award, color: "from-amber-500 to-orange-500", text: "text-amber-600", bg: "bg-amber-50" },
              { label: "Courses", desc: "View Classes", href: "/admin/courses", icon: BookOpen, color: "from-indigo-500 to-violet-500", text: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Rooms", desc: "Check Status", href: "/admin/rooms", icon: DoorOpen, color: "from-sky-500 to-cyan-500", text: "text-sky-600", bg: "bg-sky-50" },
            ].map((act, i) => (
              <a
                key={i}
                href={act.href}
                className="group flex flex-col items-center justify-center p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-100 hover:border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 text-center relative overflow-hidden"
              >
                <div className={`p-3.5 rounded-2xl ${act.bg} ${act.text} transition-transform group-hover:scale-110 duration-300`}>
                  <act.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs mt-3 leading-tight tracking-tight">{act.label}</h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">{act.desc}</p>
              </a>
            ))}
          </div>
        </div> */}

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
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
      if (Array.isArray(childAttendance)) return { total: 0, present: 0, rate: 0 };
      const attData = childAttendance as any; // ChildAttendanceData
      if (!attData || !attData.summary) return { total: 0, present: 0, rate: 0 };
      return attData.summary;
    })();

    const pieData = [
      { name: "Present", value: summary.present, color: "#10b981" },
      { name: "Absent", value: summary.total - summary.present, color: "#ef4444" },
    ];

    const childPayments = parent.childPayments || [];
    const totalPaid = childPayments.reduce((acc: number, p: any) => acc + (p.total_paid || 0), 0);
    const remainingBalance = childPayments.reduce((acc: number, p: any) => acc + (p.remaining_balance || 0), 0);
    const totalPaymentsLeft = childPayments.reduce((acc: number, p: any) => acc + (p.payments_left || 0), 0);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/30 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                  <span className="text-lg font-black font-outfit">Ks</span>
                </div>
                <div className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase">Paid</div>
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Paid</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalPaid.toLocaleString()} MMK</h3>
              <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Tuition fees settled
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/50 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                  <span className="text-lg font-black font-outfit">Ks</span>
                </div>
                {totalPaymentsLeft > 0 ? (
                  <div className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg uppercase">
                    {totalPaymentsLeft} {totalPaymentsLeft === 1 ? "Payment" : "Payments"} Left
                  </div>
                ) : (
                  <div className="text-xs font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg uppercase">
                    Fully Paid
                  </div>
                )}
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Remaining Balance</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{remainingBalance.toLocaleString()} MMK</h3>
              <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                Remaining tuition liability
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 p-8 lg:col-span-2 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-black text-slate-900 text-xl tracking-tight">Recent Attended Classes</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Status of your child's recent class attendances</p>
              </div>
              <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {(!(childAttendance as any)?.records || (childAttendance as any).records.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-10">
                  <div className="p-4 bg-slate-50 rounded-full">
                    <Fingerprint className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-bold">No attendance records found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(childAttendance as any).records?.map((record: any, index: number) => (
                    <div
                      key={index}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-md hover:border-brand-100 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${record.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                          }`}>
                          {record.status === 'Present' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-rose-500" />}
                        </div>
                        <div>
                          <div className="font-black text-slate-800 tracking-tight">{record.course_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{record.slot}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-xs font-bold text-slate-500">{record.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${record.status === 'Present'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-rose-500/10 text-rose-600'
                        }`}>
                        {record.status}
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setChildPage(p => Math.max(1, p - 1))}
                      disabled={childPage === 1}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-600 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Page {childPage} of {(childAttendance as any).pagination?.total_pages || 1}
                    </div>
                    <button
                      onClick={() => setChildPage(p => p + 1)}
                      disabled={childPage >= ((childAttendance as any).pagination?.total_pages || 1)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-slate-600 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
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

        {/* Tuition & Fees Summary Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100/50 p-8 mt-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-slate-900 text-xl tracking-tight">Tuition & Fees Summary</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Payment plans, fees details, and remaining installments per course. Click on any row to view transaction receipts.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Course Details</th>
                  <th className="px-6 py-4">Payment Plan</th>
                  <th className="px-6 py-4">Total Course Fee</th>
                  <th className="px-6 py-4">Total Paid (MMK)</th>
                  <th className="px-6 py-4">Total Discount</th>
                  <th className="px-6 py-4">Remaining Balance</th>
                  <th className="px-6 py-4">Payments Left</th>
                  <th className="px-6 py-4">Exam Fee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {childPayments?.map((p: any, i: number) => (
                  <tr 
                    key={i} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                    onClick={() => setSelectedPaymentDetails(p)}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      <div>{p.course_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{p.course_code} • {p.enrollment_code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-bold capitalize">
                      {p.payment_plan}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-bold">
                      {p.total_fee.toLocaleString()} MMK
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-bold">
                      {p.total_paid.toLocaleString()} MMK
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {p.total_discount > 0 ? `${p.total_discount.toLocaleString()} MMK` : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-bold">
                      {p.remaining_balance.toLocaleString()} MMK
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-bold">
                      {p.payment_plan === "installment" && p.remaining_balance > 0 ? (
                        <span>
                          {p.payments_left} {p.payments_left === 1 ? "payment" : "payments"} left
                          <div className="text-[10px] text-slate-400 font-medium">({p.installment_amount.toLocaleString()} MMK / installment)</div>
                        </span>
                      ) : p.remaining_balance > 0 ? (
                        <span>1 payment left</span>
                      ) : (
                        <span>0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.exam_fee_total_gbp > 0 ? (
                        <div>
                          <div className="font-bold text-slate-700">{p.exam_fee_total_gbp} GBP</div>
                          <div className="text-[10px] font-semibold mt-0.5">
                            {p.exam_fee_paid_gbp > 0 || p.exam_fee_paid_mmk > 0 ? (
                              <span className="text-emerald-600">
                                Paid: {p.exam_fee_paid_gbp} GBP
                                {p.exam_fee_paid_mmk > 0 && ` + ${p.exam_fee_paid_mmk.toLocaleString()} MMK`}
                              </span>
                            ) : (
                              <span className="text-slate-400">Unpaid</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.status === "Paid" 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPaymentDetails(p);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-brand-600 hover:bg-brand-50 border border-brand-100 transition-colors uppercase tracking-wider"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Receipts
                      </button>
                    </td>
                  </tr>
                ))}
                {(!childPayments || childPayments.length === 0) && (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-slate-400 font-medium">
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {selectedPaymentDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedPaymentDetails(null)} />
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight font-outfit uppercase">
                  Payment Transactions
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  {selectedPaymentDetails.course_name} ({selectedPaymentDetails.course_code}) • {selectedPaymentDetails.enrollment_code}
                </p>
              </div>
              <button
                onClick={() => setSelectedPaymentDetails(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {(!selectedPaymentDetails.payments || selectedPaymentDetails.payments.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-3">
                  <Fingerprint className="w-12 h-12 text-slate-300" />
                  <p className="font-bold">No payment transactions found</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-6 py-4">Receipt No.</th>
                        <th className="px-6 py-4">Paid Date</th>
                        <th className="px-6 py-4">For Month</th>
                        <th className="px-6 py-4">Amount Paid</th>
                        <th className="px-6 py-4">Exam Fee Paid</th>
                        <th className="px-6 py-4">Discount</th>
                        <th className="px-6 py-4">Fine/Extra Fee</th>
                        <th className="px-6 py-4">Payment Method</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedPaymentDetails.payments.map((rec: any, idx: number) => {
                        const totalAmt = (rec.amount || 0) + (rec.amount_2 || 0);
                        const fineExtra = (rec.fine_amount || 0) + (rec.extra_items_fee || 0);
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-700">
                              #{rec.payment_id}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium">
                              {rec.payment_date ? rec.payment_date.split("T")[0] : "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium capitalize">
                              {rec.month || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-800 font-bold">
                              {totalAmt.toLocaleString()} MMK
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-700">
                              {rec.exam_fee_paid_gbp > 0 || rec.exam_fee_paid_mmk > 0 ? (
                                <span className="text-emerald-600">
                                  {rec.exam_fee_paid_gbp > 0 ? `+${rec.exam_fee_paid_gbp} GBP` : ""}
                                  {rec.exam_fee_paid_mmk > 0 ? ` +${rec.exam_fee_paid_mmk.toLocaleString()} MMK` : ""}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {rec.discount_amount > 0 ? `${rec.discount_amount.toLocaleString()} MMK` : "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {fineExtra > 0 ? (
                                <span className="text-rose-600 font-semibold">
                                  +{fineExtra.toLocaleString()} MMK
                                  {rec.fine_reason && <div className="text-[10px] text-slate-400 font-normal">({rec.fine_reason})</div>}
                                </span>
                              ) : "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-semibold">
                              {rec.payment_method}
                              {rec.payment_method_2 && ` + ${rec.payment_method_2}`}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                rec.status === "Paid" 
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                  : "bg-amber-50 text-amber-600 border border-amber-100"
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedPaymentDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={15} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pv" 
                  stroke="#4f46e5" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#4f46e5' }}
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
                <tr key={i} className="hover:bg-blue-50 hover:shadow-md transition-colors">
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

        {/* Mobile View (Enhanced Cards) */}
        <div className="block sm:hidden divide-y divide-slate-100/50 bg-slate-50/30">
          {courses.map((c, i) => (
            <div key={i} className="p-5 bg-white mb-2 last:mb-0 shadow-sm border-y border-slate-100 first:border-t-0 active:bg-slate-50 transition-all">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center font-black text-brand-600 text-lg shadow-inner shrink-0 leading-none">
                    {c.course.course_name[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-800 leading-tight truncate text-sm">{c.course.course_name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Enrolled • {c.enrollment_date.split(" ")[0]}</p>
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                   <div className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {c.status}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                 <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 flex flex-col gap-0.5">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Batch Info</p>
                    <p className="text-xs font-bold text-slate-700">{c.batch_no || "N/A"}</p>
                 </div>
                 <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 flex flex-col gap-0.5">
                    <p className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Section</p>
                    <p className="text-xs font-bold text-slate-700">Regular Class</p>
                 </div>
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="p-16 text-center text-slate-300">
               <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
               <p className="font-black text-xs uppercase tracking-widest">No enrollments yet</p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
