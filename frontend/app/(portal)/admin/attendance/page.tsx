"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminAttendanceRecord, AdminCourse, AdminService, BatchAttendanceReport } from "@/services/admin.service";
import { Plus, Search, RefreshCw, X, Users, CheckCircle, XCircle, FileText, Download, BarChart2, Clock, AlertTriangle, Lock, ChevronDown } from "lucide-react";
import { exportToExcel } from "@/utils/excelExport";
import { generateAttendanceReportPDF } from "@/utils/pdfAttendanceReport";
import {
  useEnrollments, useAttendance, useTimetables, useCourses, useMarkAttendance,
  useUpdateAttendance, useSubjects, useBatches, useEndBatch, useBatchAttendanceReport
} from "@/hooks/useAdmin";

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${danger ? "bg-red-50" : "bg-amber-50"}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-600" : "text-amber-600"}`} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="btn-secondary btn-md flex-1">Cancel</button>
          <button onClick={onConfirm} className={`btn-md flex-1 font-bold ${danger ? "bg-red-600 text-white hover:bg-red-700 shadow-red-100 shadow-md" : "btn-primary"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PercentBar({ value, colorClass }: { value: number | null; colorClass: string }) {
  const pct = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-10 text-right">
        {value === null ? "—" : `${value}%`}
      </span>
    </div>
  );
}

interface BatchGroup {
  id: string;
  batch_id: number | null;
  course_code: string;
  course_name: string;
  batch_no: string;
  batch_start_date?: string | null;
  batch_end_date?: string | null;
  is_active: boolean;
  students: { student_code: string; student_name: string; enrollment_id: number }[];
}

type ModalTab = "attendance" | "report";

const getTodayDateString = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
};

export default function AdminAttendancePage() {
  const router = useRouter();
  const { isAdminOrSalesOrManager, isAdmin, loading, user } = useAuth();

  const { data: enrollmentsData, isLoading: enrollmentsLoading, refetch: refetchEnrollments } = useEnrollments(undefined, 1, 1000);
  const { data: attendanceData = [], isLoading: attendanceLoading, refetch: refetchAttendance } = useAttendance();
  const { data: timetablesData = [], isLoading: timetablesLoading, refetch: refetchTimetables } = useTimetables();
  const { data: coursesData, isLoading: coursesLoading, refetch: refetchCourses } = useCourses(1, 100);
  const { data: batchesData, isLoading: batchesLoading, refetch: refetchBatches } = useBatches();
  const { data: subjectsData, isLoading: subjectsLoading, refetch: refetchSubjects } = useSubjects();

  const markMutation = useMarkAttendance();
  const updateMutation = useUpdateAttendance();
  const endBatchMutation = useEndBatch();

  const enrollments = enrollmentsData?.data || [];
  const attendance = attendanceData;
  const timetables = timetablesData;
  const courses = coursesData?.data || [];
  const batches = batchesData?.data || [];
  const subjects = subjectsData?.data || [];

  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [targetDate, setTargetDate] = useState(getTodayDateString());
  const [filterMode, setFilterMode] = useState<"active" | "ended">("active");

  const [selectedGroup, setSelectedGroup] = useState<BatchGroup | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("attendance");

  // Subject overrides: key = `${slot.id || slot.text}`, value = subject_id | null (null = no subject)
  const [subjectOverrides, setSubjectOverrides] = useState<Record<string, number | null>>({});

  const [studentReportOpen, setStudentReportOpen] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedStudentCode, setSelectedStudentCode] = useState("");

  // End batch confirm
  const [endBatchConfirmOpen, setEndBatchConfirmOpen] = useState(false);
  const [endBatchTarget, setEndBatchTarget] = useState<BatchGroup | null>(null);

  // Batch attendance report
  const [reportBatchId, setReportBatchId] = useState<number | null>(null);
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>("");
  const { data: batchReport, isLoading: reportLoading } = useBatchAttendanceReport(reportBatchId, selectedReportMonth || undefined);

  useEffect(() => {
    if (!loading && !isAdminOrSalesOrManager) router.replace("/dashboard");
  }, [loading, isAdminOrSalesOrManager, router]);

  const load = async () => {
    await Promise.all([
      refetchEnrollments(), refetchAttendance(), refetchTimetables(),
      refetchCourses(), refetchBatches(), refetchSubjects(),
    ]);
  };

  const dateObj = useMemo(() => {
    const [y, m, d] = targetDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [targetDate]);

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = daysOfWeek[dateObj.getDay()];

  // Build batch groups from enrollments, enriched with batch is_active + start/end from batches API
  const batchesMap = useMemo(() => {
    const m = new Map<number, typeof batches[0]>();
    batches.forEach(b => m.set(b.batch_id, b));
    return m;
  }, [batches]);

  const groups = useMemo(() => {
    const batchMap = new Map<string, BatchGroup>();

    enrollments.forEach((e) => {
      if (!e.course_code || !e.student_code || !e.batch_no || !e.status) return;
      const key = `${e.course_code}-${e.batch_no}`;
      if (!batchMap.has(key)) {
        // Try to get is_active from batches API
        const batchInfo = e.batch_id ? batchesMap.get(e.batch_id) : null;
        const isActive = batchInfo ? batchInfo.is_active : true; // default active if not found

        batchMap.set(key, {
          id: key,
          batch_id: e.batch_id ?? null,
          course_code: e.course_code,
          course_name: e.course_name || e.course_code,
          batch_no: e.batch_no,
          batch_start_date: batchInfo?.start_date ?? e.batch_start_date ?? null,
          batch_end_date: batchInfo?.end_date ?? e.batch_end_date ?? null,
          is_active: isActive,
          students: [],
        });
      }
      batchMap.get(key)!.students.push({
        student_code: e.student_code,
        student_name: e.student_name || "Unknown",
        enrollment_id: e.enrollment_id,
      });
    });

    let arr = Array.from(batchMap.values());

    // Filter by active/ended using is_active flag
    if (filterMode === "ended") {
      arr = arr.filter(g => !g.is_active);
    } else {
      arr = arr.filter(g => g.is_active);
    }

    // For active mode, also apply timetable schedule filter (unless searching)
    const term = q.trim().toLowerCase();
    if (term) {
      return arr.filter(g =>
        g.course_name.toLowerCase().includes(term) ||
        g.course_code.toLowerCase().includes(term) ||
        g.batch_no.toLowerCase().includes(term)
      );
    }

    if (filterMode === "ended") return arr;

    // Active mode: filter by scheduled timetable today
    const scheduledToday = timetables.filter((t: any) => t.day_of_week === currentDayName);
    const scheduledArr = arr.filter(g =>
      scheduledToday.some((t: any) =>
        t.course_code === g.course_code && (!t.batch_no || t.batch_no === g.batch_no)
      )
    );

    // Add timetable-only entries with no enrollments yet
    scheduledToday.forEach((t: any) => {
      const hasBatch = scheduledArr.some(g =>
        g.course_code === t.course_code && (!t.batch_no || g.batch_no === t.batch_no)
      );
      if (!hasBatch) {
        const fallbackBatchNo = t.batch_no || "Pending Enrollments";
        if (!scheduledArr.some(g => g.course_code === t.course_code && g.batch_no === fallbackBatchNo)) {
          scheduledArr.push({
            id: `${t.course_code}-${fallbackBatchNo}`,
            batch_id: t.batch_id ?? null,
            course_code: t.course_code,
            course_name: t.course_name || t.course_code,
            batch_no: fallbackBatchNo,
            batch_start_date: t.batch_start_date ?? null,
            batch_end_date: t.batch_end_date ?? null,
            is_active: true,
            students: [],
          });
        }
      }
    });

    return scheduledArr;
  }, [enrollments, q, timetables, currentDayName, filterMode, batchesMap]);

  // Slots for selected group
  const currentSlots = useMemo(() => {
    if (!selectedGroup) return [];
    const groupTimetables = timetables.filter((t: any) =>
      t.course_code === selectedGroup.course_code &&
      t.day_of_week === currentDayName &&
      (!t.batch_no || t.batch_no === selectedGroup.batch_no)
    );
    if (groupTimetables.length > 0) {
      return groupTimetables.map((t: any) => ({
        id: t.timetable_id,
        text: `${t.start_time} - ${t.end_time}`,
        teacher_name: t.teacher_name,
        subject_id: t.subject_id ?? null,
        subject_name: t.subject_name ?? null,
      })).sort((a: any, b: any) => a.text.localeCompare(b.text));
    }
    // Fallback: all distinct slots for this course/batch
    const allTT = timetables.filter((t: any) =>
      t.course_code === selectedGroup.course_code &&
      (!t.batch_no || t.batch_no === selectedGroup.batch_no)
    );
    const seen = new Set<string>();
    const distinct: any[] = [];
    for (const t of allTT) {
      const key = `${t.start_time} - ${t.end_time}`;
      if (!seen.has(key)) { seen.add(key); distinct.push({ id: t.timetable_id, text: key, teacher_name: t.teacher_name, subject_id: t.subject_id ?? null, subject_name: t.subject_name ?? null }); }
    }
    if (distinct.length > 0) return distinct.sort((a: any, b: any) => a.text.localeCompare(b.text));
    return [
      { id: null, text: "Morning", teacher_name: null, subject_id: null, subject_name: null },
      { id: null, text: "Afternoon", teacher_name: null, subject_id: null, subject_name: null },
    ];
  }, [selectedGroup, timetables, currentDayName]);

  // Subjects for this course (for the subject dropdown)
  const courseSubjects = useMemo(() => {
    if (!selectedGroup) return [];
    return subjects.filter(s => s.course_id === courses.find(c => c.course_code === selectedGroup.course_code)?.course_id);
  }, [selectedGroup, subjects, courses]);

  // Is batch started?
  const isBatchStarted = (group: BatchGroup) => {
    if (!group.batch_start_date) return true; // no start date = treat as started
    return getTodayDateString() >= group.batch_start_date;
  };

  const reportRecords = useMemo(() => {
    if (!selectedStudentCode || !selectedGroup) return [];
    const c = courses.find(x => x.course_code === selectedGroup.course_code);
    return attendance.filter(a => {
      if (a.user_code !== selectedStudentCode) return false;
      if (c && c.start_date && a.attendance_date < c.start_date) return false;
      if (c && c.end_date && a.attendance_date > c.end_date) return false;
      return true;
    }).sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [selectedStudentCode, selectedGroup, attendance, courses]);

  if (loading) return null;
  if (!isAdminOrSalesOrManager) return null;

  const openGroup = (g: BatchGroup) => {
    setSelectedGroup(g);
    setModalTab("attendance");
    setSubjectOverrides({});
    setSelectedReportMonth("");
    setGroupModalOpen(true);
    if (g.batch_id) setReportBatchId(g.batch_id);
  };

  const getSlotSubjectOverride = (slot: any): number | null => {
    const key = slot.id?.toString() ?? slot.text;
    const override = subjectOverrides[key];
    if (override === undefined) return slot.subject_id ?? null; // use timetable default
    if (override === null) return null; // no subject (general)
    return override;
  };

  const doMarkAttendance = async (student_code: string, slot: any, check_today: boolean) => {
    setError("");
    const subjectId = getSlotSubjectOverride(slot);
    try {
      await markMutation.mutateAsync({
        student_code,
        slot: slot.text,
        timetable_id: slot.id ?? null,
        subject_id: subjectId,
        check_today,
        attendance_date: targetDate,
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to mark attendance");
    }
  };

  const doUpdateAttendance = async (attendance_id: number, check_today: boolean) => {
    setError("");
    try {
      await updateMutation.mutateAsync({ id: attendance_id, payload: { check_today } });
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to update attendance");
    }
  };

  const doEndBatch = async () => {
    if (!endBatchTarget?.batch_id) return;
    try {
      await endBatchMutation.mutateAsync(endBatchTarget.batch_id);
      setEndBatchConfirmOpen(false);
      setGroupModalOpen(false);
      setEndBatchTarget(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to end batch");
    }
  };

  const combinedLoading = loading || enrollmentsLoading || attendanceLoading || timetablesLoading ||
    coursesLoading || batchesLoading || subjectsLoading || markMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            {filterMode === "active"
              ? `Active batches scheduled for ${targetDate === getTodayDateString() ? "today" : targetDate} (${currentDayName}).`
              : `Ended batches — historical attendance records.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterMode("active")}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all active:scale-95 ${filterMode === "active" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >Active</button>
            <button
              onClick={() => setFilterMode("ended")}
              className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all active:scale-95 ${filterMode === "ended" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >Ended</button>
          </div>
          {filterMode === "active" && (
            <input
              type="date" value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
            />
          )}
          <button onClick={load} disabled={combinedLoading} className="btn-secondary btn-md">
            <RefreshCw className={`w-4 h-4 ${combinedLoading ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Batch Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by course or batch…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium text-sm" />
          </div>
          {error && <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6 bg-slate-50/50">
          {groups.map(g => {
            const started = isBatchStarted(g);
            return (
              <div key={g.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-shadow hover:shadow-md ${!started ? "border-slate-200 opacity-80" : "border-slate-200"}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-800 leading-tight truncate">{g.course_name}</h3>
                    {g.batch_start_date && (
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {g.batch_start_date} {g.batch_end_date ? `→ ${g.batch_end_date}` : "→ ongoing"}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end ml-2 shrink-0">
                    <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100 whitespace-nowrap">{g.batch_no}</span>
                    {!started && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Not Started
                      </span>
                    )}
                    {!g.is_active && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg">Ended</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center text-sm font-semibold text-slate-600">
                    <Users className="w-4 h-4 mr-1.5 text-slate-400" />
                    {g.students.length} Student{g.students.length !== 1 ? "s" : ""}
                  </div>
                  <button
                    onClick={() => openGroup(g)}
                    disabled={!started}
                    title={!started ? `Batch starts on ${g.batch_start_date}` : undefined}
                    className={`btn-md text-sm font-bold ${started ? "btn-primary" : "bg-slate-100 text-slate-400 cursor-not-allowed rounded-xl px-4 py-2"}`}
                  >
                    {started ? "Manage" : "Not Started"}
                  </button>
                </div>
              </div>
            );
          })}
          {groups.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium text-sm">
              {combinedLoading ? "Loading…" : q ? "No batches matched your search." : filterMode === "ended" ? "No ended batches found." : `No active batches scheduled for ${currentDayName}.`}
            </div>
          )}
        </div>
      </div>

      {/* Main Batch Modal */}
      <Modal
        title={`${selectedGroup?.course_name} — ${selectedGroup?.batch_no}`}
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
      >
        {selectedGroup && (
          <div className="space-y-4 pt-1">
            {/* Tab Bar */}
            <div className="flex items-center justify-between">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setModalTab("attendance")}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${modalTab === "attendance" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                >
                  <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Attendance
                </button>
                <button
                  onClick={() => setModalTab("report")}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${modalTab === "report" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                >
                  <BarChart2 className="w-3.5 h-3.5 inline mr-1" /> Report
                </button>
              </div>
              {isAdmin && selectedGroup.is_active && selectedGroup.batch_id && (
                <button
                  onClick={() => { setEndBatchTarget(selectedGroup); setEndBatchConfirmOpen(true); }}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                >
                  End Batch
                </button>
              )}
            </div>

            {/* ── ATTENDANCE TAB ── */}
            {modalTab === "attendance" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-brand-50 border border-brand-100 rounded-2xl p-4">
                  <div>
                    <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest leading-none mb-1">Attendance Date</p>
                    <p className="font-bold text-brand-900 text-base">{dateObj.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>

                {/* Subject Overrides per Slot */}
                {currentSlots.length > 0 && courseSubjects.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Subject for Today's Session</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentSlots.map(slot => {
                        const key = slot.id?.toString() ?? slot.text;
                        const currentVal = subjectOverrides[key] === undefined ? (slot.subject_id ?? "") : (subjectOverrides[key] ?? "");
                        return (
                          <div key={key} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {slot.text}
                            </label>
                            <div className="relative">
                              <select
                                value={currentVal as any}
                                onChange={e => {
                                  const v = e.target.value;
                                  setSubjectOverrides(prev => ({ ...prev, [key]: v === "" ? null : Number(v) }));
                                }}
                                className="w-full pl-3 pr-8 py-2 text-sm font-semibold text-slate-700 bg-white border border-amber-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                              >
                                <option value="">(General / No Subject)</option>
                                {courseSubjects.map(s => (
                                  <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                      <tr>
                        <th className="px-5 py-3 sticky left-0 bg-slate-50 z-10">Student</th>
                        <th className="px-5 py-3">Code</th>
                        {currentSlots.map(slot => {
                          const key = slot.id?.toString() ?? slot.text;
                          const activeSubjectId = subjectOverrides[key] === undefined ? (slot.subject_id ?? null) : (subjectOverrides[key] as number | null);
                          const activeSub = courseSubjects.find(s => s.subject_id === activeSubjectId);
                          return (
                            <th key={slot.text + (slot.id || "")} className="px-5 py-3 text-center border-l border-slate-200">
                              <div className="flex flex-col items-center">
                                <span className="text-brand-900">{slot.text}</span>
                                {activeSub ? (
                                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">{activeSub.subject_name}</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">General</span>
                                )}
                                {slot.teacher_name && <span className="text-[9px] text-slate-400 font-normal">{slot.teacher_name}</span>}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedGroup.students.map(stu => (
                        <tr key={stu.student_code} className="hover:bg-blue-50 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-800 sticky left-0 bg-white/95 z-10 min-w-[180px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate">{stu.student_name}</span>
                              <button
                                onClick={() => { setSelectedStudentName(stu.student_name); setSelectedStudentCode(stu.student_code); setStudentReportOpen(true); }}
                                className="p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200/50 shrink-0"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-500">{stu.student_code}</td>
                          {currentSlots.map(slot => {
                            const record = attendance.find(a =>
                              a.user_code === stu.student_code &&
                              a.attendance_date.startsWith(targetDate) &&
                              (a.timetable_id === slot.id || (a.slot === slot.text && !a.timetable_id))
                            );
                            return (
                              <td key={slot.text} className="px-5 py-4 border-l border-slate-100 text-center">
                                {record ? (
                                  <div className="flex flex-col items-center gap-1 min-w-[100px]">
                                    {record.check_today ? (
                                      <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-xs border border-emerald-200">
                                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Present
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded-md font-bold text-xs border border-red-200">
                                        <XCircle className="w-3.5 h-3.5 mr-1" /> Absent
                                      </span>
                                    )}
                                    {record.subject_name && (
                                      <span className="text-[9px] text-amber-600 font-semibold">{record.subject_name}</span>
                                    )}
                                    {isAdmin && (
                                      <button onClick={() => doUpdateAttendance(record.attendance_id, !record.check_today)}
                                        className="text-[10px] text-slate-400 font-semibold hover:text-brand-600 underline">
                                        Change
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex justify-center items-center gap-1 min-w-[100px]">
                                    <button onClick={() => doMarkAttendance(stu.student_code, slot, true)}
                                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] uppercase font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors">P</button>
                                    <button onClick={() => doMarkAttendance(stu.student_code, slot, false)}
                                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] uppercase font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors">A</button>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {selectedGroup.students.length === 0 && (
                        <tr><td colSpan={2 + currentSlots.length} className="px-5 py-8 text-center text-slate-400">No students enrolled in this batch.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="sm:hidden space-y-3">
                  {selectedGroup.students.map(stu => (
                    <div key={stu.student_code} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-slate-800">{stu.student_name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stu.student_code}</div>
                        </div>
                        <button onClick={() => { setSelectedStudentName(stu.student_name); setSelectedStudentCode(stu.student_code); setStudentReportOpen(true); }}
                          className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50">
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                      {currentSlots.map(slot => {
                        const record = attendance.find(a =>
                          a.user_code === stu.student_code &&
                          a.attendance_date.startsWith(targetDate) &&
                          (a.timetable_id === slot.id || a.slot === slot.text)
                        );
                        const key = slot.id?.toString() ?? slot.text;
                        const activeSubjectId = subjectOverrides[key] === undefined ? (slot.subject_id ?? null) : (subjectOverrides[key] as number | null);
                        const activeSub = courseSubjects.find(s => s.subject_id === activeSubjectId);
                        return (
                          <div key={slot.text} className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-slate-200/60">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{slot.text}</span>
                              {activeSub && <span className="text-[10px] text-amber-600 font-bold">{activeSub.subject_name}</span>}
                              {slot.teacher_name && <span className="text-[8px] text-slate-500">Tr. {slot.teacher_name}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {record ? (
                                <>
                                  <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] border ${record.check_today ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-red-700 bg-red-50 border-red-100"}`}>
                                    {record.check_today ? "Present" : "Absent"}
                                  </span>
                                  {isAdmin && (
                                    <button onClick={() => doUpdateAttendance(record.attendance_id, !record.check_today)} className="text-[10px] text-brand-600 font-bold underline">Change</button>
                                  )}
                                </>
                              ) : (
                                <div className="flex gap-1.5">
                                  <button onClick={() => doMarkAttendance(stu.student_code, slot, true)} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black hover:border-emerald-300 hover:text-emerald-600 active:scale-95 transition-all">P</button>
                                  <button onClick={() => doMarkAttendance(stu.student_code, slot, false)} className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black hover:border-red-300 hover:text-red-600 active:scale-95 transition-all">A</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Footer actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (!selectedGroup) return;
                      const rows = selectedGroup.students.map(stu => {
                        const row: any = { "Student Name": stu.student_name, "Student Code": stu.student_code };
                        currentSlots.forEach(slot => {
                          const rec = attendance.find(a => a.user_code === stu.student_code && a.attendance_date.startsWith(targetDate) && (a.timetable_id === slot.id || a.slot === slot.text));
                          row[slot.text] = rec ? (rec.check_today ? "Present" : "Absent") : "Not Marked";
                        });
                        return row;
                      });
                      exportToExcel(rows, `Attendance_${selectedGroup.course_code}_${selectedGroup.batch_no}_${targetDate}`, "Attendance");
                    }}
                    disabled={!selectedGroup || selectedGroup.students.length === 0}
                    className="btn-primary btn-md !bg-emerald-600 hover:!bg-emerald-700 !shadow-emerald-100 w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <button onClick={() => setGroupModalOpen(false)} className="btn-secondary btn-md w-full sm:w-auto">Close</button>
                </div>
              </div>
            )}

            {/* ── REPORT TAB ── */}
            {modalTab === "report" && (
              <div className="space-y-5">
                {reportLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-7 h-7 animate-spin text-brand-500" />
                  </div>
                ) : batchReport ? (
                  <>
                    {/* Month selector dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Select Report Month</label>
                        <div className="relative">
                          <select
                            value={selectedReportMonth}
                            onChange={(e) => setSelectedReportMonth(e.target.value)}
                            className="pl-3 pr-8 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none"
                          >
                            <option value="">All Time Summary</option>
                            {batchReport.available_months?.map(m => {
                              const [year, month] = m.split("-");
                              const date = new Date(Number(year), Number(month) - 1, 1);
                              const name = date.toLocaleString("default", { month: "long", year: "numeric" });
                              return (
                                <option key={m} value={m}>{name}</option>
                              );
                            })}
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      {selectedReportMonth && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classes in Selected Month</p>
                          <p className="text-xl font-extrabold text-slate-800">{batchReport.total_classes_specific_month ?? 0} sessions</p>
                        </div>
                      )}
                    </div>

                    {/* Summary cards */}
                    {!selectedReportMonth && (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "This Week", total: batchReport.total_classes_week, color: "text-blue-600 bg-blue-50 border-blue-100" },
                          { label: "This Month", total: batchReport.total_classes_month, color: "text-violet-600 bg-violet-50 border-violet-100" },
                          { label: "Overall", total: batchReport.total_classes_overall, color: "text-brand-600 bg-brand-50 border-brand-100" },
                        ].map(item => (
                          <div key={item.label} className={`rounded-2xl border p-4 text-center ${item.color}`}>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-70">{item.label}</p>
                            <p className="text-2xl font-black mt-1">{item.total}</p>
                            <p className="text-[10px] font-semibold opacity-60 mt-0.5">Classes</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Per-student table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      {selectedReportMonth ? (
                        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-[1fr_120px_100px_100px] text-xs font-bold text-slate-500 uppercase tracking-wide">
                          <span>Student</span>
                          <span className="text-center text-amber-600">Selected Month</span>
                          <span className="text-center text-amber-700">Month Rate</span>
                          <span className="text-center text-brand-600">Overall Rate</span>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-[1fr_80px_80px_80px] text-xs font-bold text-slate-500 uppercase tracking-wide">
                          <span>Student</span>
                          <span className="text-center text-blue-600">Week</span>
                          <span className="text-center text-violet-600">Month</span>
                          <span className="text-center text-brand-600">Overall</span>
                        </div>
                      )}

                      <div className="divide-y divide-slate-100 max-h-[45vh] overflow-y-auto custom-scrollbar">
                        {batchReport.students.map(stu => {
                          const overallPct = stu.overall.percentage;
                          const barColor = overallPct === null ? "bg-slate-200" : overallPct >= 80 ? "bg-emerald-500" : overallPct >= 60 ? "bg-amber-400" : "bg-red-500";
                          
                          if (selectedReportMonth) {
                            const spec = stu.monthly_specific;
                            const specPct = spec?.percentage ?? null;
                            const specBarColor = specPct === null ? "bg-slate-200" : specPct >= 80 ? "bg-emerald-500" : specPct >= 60 ? "bg-amber-400" : "bg-red-500";
                            return (
                              <div key={stu.user_code} className="px-5 py-3.5 grid grid-cols-[1fr_120px_100px_100px] items-center gap-2 hover:bg-slate-50 transition-colors">
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{stu.username}</p>
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{stu.user_code}</p>
                                  <div className="mt-1.5">
                                    <PercentBar value={specPct} colorClass={specBarColor} />
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-sm font-bold text-slate-700">
                                    {spec ? `${spec.present} / ${spec.total}` : "0 / 0"}
                                  </span>
                                </div>
                                <div className="text-center">
                                  <span className={`text-sm font-bold ${specPct === null ? "text-slate-300" : specPct >= 80 ? "text-emerald-600" : specPct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                    {specPct === null ? "—" : `${specPct}%`}
                                  </span>
                                </div>
                                <div className="text-center">
                                  <span className={`text-sm font-bold ${overallPct === null ? "text-slate-300" : overallPct >= 80 ? "text-emerald-600" : overallPct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                    {overallPct === null ? "—" : `${overallPct}%`}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={stu.user_code} className="px-5 py-3.5 grid grid-cols-[1fr_80px_80px_80px] items-center gap-2 hover:bg-slate-50 transition-colors">
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{stu.username}</p>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{stu.user_code}</p>
                                <div className="mt-1.5">
                                  <PercentBar value={overallPct} colorClass={barColor} />
                                </div>
                              </div>
                              <div className="text-center">
                                <span className={`text-sm font-bold ${stu.week.percentage === null ? "text-slate-300" : stu.week.percentage >= 80 ? "text-emerald-600" : stu.week.percentage >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                  {stu.week.percentage === null ? "—" : `${stu.week.percentage}%`}
                                </span>
                                <p className="text-[9px] text-slate-400">{stu.week.present}/{stu.week.total}</p>
                              </div>
                              <div className="text-center">
                                <span className={`text-sm font-bold ${stu.month.percentage === null ? "text-slate-300" : stu.month.percentage >= 80 ? "text-emerald-600" : stu.month.percentage >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                  {stu.month.percentage === null ? "—" : `${stu.month.percentage}%`}
                                </span>
                                <p className="text-[9px] text-slate-400">{stu.month.present}/{stu.month.total}</p>
                              </div>
                              <div className="text-center">
                                <span className={`text-sm font-bold ${overallPct === null ? "text-slate-300" : overallPct >= 80 ? "text-emerald-600" : overallPct >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                  {overallPct === null ? "—" : `${overallPct}%`}
                                </span>
                                <p className="text-[9px] text-slate-400">{stu.overall.present}/{stu.overall.total}</p>
                              </div>
                            </div>
                          );
                        })}
                        {batchReport.students.length === 0 && (
                          <div className="px-5 py-10 text-center text-slate-400 font-medium text-sm">No attendance data yet for this batch.</div>
                        )}
                      </div>
                    </div>

                    {/* Export and PDF actions */}
                    <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          if (!batchReport || !selectedGroup) return;
                          generateAttendanceReportPDF(
                            {
                              course_name: selectedGroup.course_name,
                              batch_no: selectedGroup.batch_no,
                              start_date: batchReport.start_date,
                              end_date: batchReport.end_date,
                              is_active: batchReport.is_active
                            },
                            selectedReportMonth || null,
                            selectedReportMonth ? (batchReport.total_classes_specific_month ?? 0) : batchReport.total_classes_overall,
                            batchReport.students,
                            user?.username || "Admin"
                          );
                        }}
                        className="btn-primary btn-md !bg-brand-600 hover:!bg-brand-700 !shadow-brand-100"
                      >
                        <FileText className="w-4 h-4" /> Download PDF
                      </button>
                      <button
                        onClick={() => {
                          if (!batchReport) return;
                          const reportRows = batchReport.students.map(s => {
                            if (selectedReportMonth) {
                              return {
                                "Student": s.username,
                                "Code": s.user_code,
                                "Selected Month %": s.monthly_specific?.percentage ?? "N/A",
                                "Selected Month Present": s.monthly_specific?.present ?? 0,
                                "Selected Month Total": s.monthly_specific?.total ?? 0,
                                "Overall %": s.overall.percentage ?? "N/A",
                                "Overall Present": s.overall.present,
                                "Overall Total": s.overall.total,
                              };
                            }
                            return {
                              "Student": s.username,
                              "Code": s.user_code,
                              "Week %": s.week.percentage ?? "N/A",
                              "Week Present": s.week.present,
                              "Week Total": s.week.total,
                              "Month %": s.month.percentage ?? "N/A",
                              "Month Present": s.month.present,
                              "Month Total": s.month.total,
                              "Overall %": s.overall.percentage ?? "N/A",
                              "Overall Present": s.overall.present,
                              "Overall Total": s.overall.total,
                            };
                          });
                          const namePeriod = selectedReportMonth || "overall";
                          exportToExcel(reportRows, `Report_${selectedGroup?.course_code}_${selectedGroup?.batch_no}_${namePeriod}`, "Attendance Report");
                        }}
                        className="btn-primary btn-md !bg-emerald-600 hover:!bg-emerald-700 !shadow-emerald-100"
                      >
                        <Download className="w-4 h-4" /> Export Excel
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-400 font-medium">No report data available.</div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Student Detail Modal */}
      <Modal title={`Attendance Detail: ${selectedStudentName}`} open={studentReportOpen} onClose={() => setStudentReportOpen(false)}>
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="font-semibold text-slate-700">Course: <span className="text-slate-900">{selectedGroup?.course_name}</span></div>
            <div className="font-semibold text-slate-700">
              Present: <span className="text-brand-600">{reportRecords.filter(r => r.check_today).length}</span> / {reportRecords.length}
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[50vh] custom-scrollbar">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Slot / Range</th>
                  <th className="px-5 py-3">Teacher</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reportRecords.map(r => (
                  <tr key={r.attendance_id} className="hover:bg-blue-50">
                    <td className="px-5 py-3.5 font-bold text-slate-700">{r.attendance_date}</td>
                    <td className="px-5 py-3.5 font-medium text-amber-700">{r.subject_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      <div className="flex flex-col">
                        <span>{r.slot}</span>
                        {r.time_range && <span className="text-[10px] text-brand-600 lowercase font-bold">{r.time_range}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{r.teacher_name || "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      {r.check_today ? (
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-bold text-xs border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-1 rounded-md font-bold text-xs border border-red-200">
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Absent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {reportRecords.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setStudentReportOpen(false)} className="btn-primary btn-md w-full sm:w-auto">Close</button>
          </div>
        </div>
      </Modal>

      {/* End Batch Confirm */}
      <ConfirmDialog
        open={endBatchConfirmOpen}
        title="End This Batch?"
        message={`"${endBatchTarget?.batch_no}" for ${endBatchTarget?.course_name} will be marked as ended. Attendance can no longer be marked for this batch. This action cannot be undone easily.`}
        confirmLabel="Yes, End Batch"
        danger
        onConfirm={doEndBatch}
        onCancel={() => setEndBatchConfirmOpen(false)}
      />
    </div>
  );
}
