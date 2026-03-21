"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminAttendanceRecord, AdminEnrollment, AdminCourse, AdminService } from "@/services/admin.service";
import { Plus, Search, RefreshCw, X, Users, CheckCircle, XCircle, FileText, Download } from "lucide-react";
import { exportToExcel } from "@/utils/excelExport";


function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex flex-col max-h-[90vh] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface BatchGroup {
  id: string;
  course_code: string;
  course_name: string;
  batch_no: string;
  students: {
    student_code: string;
    student_name: string;
    enrollment_id: number;
  }[];
}

export default function AdminAttendancePage() {
  const router = useRouter();
  const { isAdminOrSales, loading } = useAuth();

  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [attendance, setAttendance] = useState<AdminAttendanceRecord[]>([]);
  const [timetables, setTimetables] = useState<any[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const getTodayDateString = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const [targetDate, setTargetDate] = useState(getTodayDateString());
  const [filterMode, setFilterMode] = useState<"scheduled" | "ended">("scheduled");

  const [selectedGroup, setSelectedGroup] = useState<BatchGroup | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const [studentReportOpen, setStudentReportOpen] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [selectedStudentCode, setSelectedStudentCode] = useState("");

  const reportRecords = useMemo(() => {
     if (!selectedStudentCode || !selectedGroup) return [];
     const c = courses.find(x => x.course_code === selectedGroup.course_code);
     return attendance.filter(a => {
        if (a.user_code !== selectedStudentCode) return false;
        if (c && c.start_date && a.attendance_date < c.start_date) return false;
        if (c && c.end_date && a.attendance_date > c.end_date) return false;
        return true;
     }).sort((a,b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [selectedStudentCode, selectedGroup, attendance, courses]);

  useEffect(() => {
    if (!loading && !isAdminOrSales) router.replace("/dashboard");
  }, [loading, isAdminOrSales, router]);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const [enrData, attData, ttData, courseData] = await Promise.all([
        AdminService.listEnrollments(),
        AdminService.listAttendance(),
        AdminService.listTimetables(),
        AdminService.listCourses()
      ]);
      setEnrollments(enrData);
      setAttendance(attData);
      setTimetables(ttData);
      setCourses(courseData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to load data");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdminOrSales) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrSales]);

  const dateObj = useMemo(() => {
    const [y, m, d] = targetDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [targetDate]);

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = daysOfWeek[dateObj.getDay()];

  const groups = useMemo(() => {
    const batchMap = new Map<string, BatchGroup>();
    enrollments.forEach((e) => {
      if (!e.course_code || !e.student_code || !e.batch_no || !e.status) return;
      const key = `${e.course_code}-${e.batch_no}`;
      if (!batchMap.has(key)) {
        batchMap.set(key, {
          id: key,
          course_code: e.course_code,
          course_name: e.course_name || e.course_code,
          batch_no: e.batch_no,
          students: []
        });
      }
      batchMap.get(key)!.students.push({
        student_code: e.student_code,
        student_name: e.student_name || "Unknown",
        enrollment_id: e.enrollment_id
      });
    });

    let arr = Array.from(batchMap.values());

    const courseMap = new Map<string, AdminCourse>();
    courses.forEach(c => courseMap.set(c.course_code, c));

    if (filterMode === "ended") {
      const todayStr = getTodayDateString();
      let endedArr = arr.filter(g => {
        const c = courseMap.get(g.course_code);
        if (c && c.end_date) {
           return c.end_date < todayStr;
        }
        return false;
      });

      const term = q.trim().toLowerCase();
      if (term) {
        return endedArr.filter(g => 
          g.course_name.toLowerCase().includes(term) || 
          g.course_code.toLowerCase().includes(term) || 
          g.batch_no.toLowerCase().includes(term)
        );
      }
      return endedArr;
    }

    arr = arr.filter(g => {
      const c = courseMap.get(g.course_code);
      if (c && c.start_date && c.end_date) {
        return targetDate >= c.start_date && targetDate <= c.end_date;
      }
      if (c && c.start_date) {
         return targetDate >= c.start_date;
      }
      if (c && c.end_date) {
         return targetDate <= c.end_date;
      }
      return true;
    });

    const scheduledCoursesToday = timetables.filter((t: any) => t.day_of_week === currentDayName);
    
    // STRICTLY RELY ON TIMETABLE: Only show batches if their course is scheduled today
    const scheduledArr = arr.filter(g => 
      scheduledCoursesToday.some((t: any) => t.course_code === g.course_code)
    );

    scheduledCoursesToday.forEach((t: any) => {
      const c = courseMap.get(t.course_code);
      let isActive = true;
      if (c && c.start_date && c.end_date) {
        isActive = targetDate >= c.start_date && targetDate <= c.end_date;
      } else if (c && c.start_date) {
         isActive = targetDate >= c.start_date;
      } else if (c && c.end_date) {
         isActive = targetDate <= c.end_date;
      }

      if (!isActive) return;

      const hasBatch = scheduledArr.some(g => g.course_code === t.course_code);
      if (!hasBatch) {
        if (!scheduledArr.some(g => g.course_code === t.course_code && g.batch_no === "Pending Enrollments")) {
          scheduledArr.push({
            id: `${t.course_code}-empty`,
            course_code: t.course_code,
            course_name: t.course_name || t.course_code,
            batch_no: "Pending Enrollments",
            students: []
          });
        }
      }
    });

    const term = q.trim().toLowerCase();
    
    // BYPASS SCHEDULE if user is directly searching
    if (term) {
      return arr.filter(g => 
        g.course_name.toLowerCase().includes(term) || 
        g.course_code.toLowerCase().includes(term) || 
        g.batch_no.toLowerCase().includes(term)
      );
    }
    
    return scheduledArr;
  }, [enrollments, q, timetables, currentDayName, courses, targetDate, filterMode]);

  const currentSlots = useMemo(() => {
    if (!selectedGroup) return [];
    const groupTimetables = timetables.filter(t => t.course_code === selectedGroup.course_code && t.day_of_week === currentDayName);
    if (groupTimetables.length > 0) {
      return Array.from(new Set(groupTimetables.map(t => `${t.start_time} - ${t.end_time}`))).sort();
    }
    // Fallback if they search class not scheduled today
    const allTimeTables = timetables.filter(t => t.course_code === selectedGroup.course_code);
    if (allTimeTables.length > 0) {
      return Array.from(new Set(allTimeTables.map(t => `${t.start_time} - ${t.end_time}`))).sort();
    }
    return ["Morning", "Afternoon", "Evening"];
  }, [selectedGroup, timetables, currentDayName]);

  if (loading) return null;
  if (!isAdminOrSales) return null;

  const openGroup = (g: BatchGroup) => {
    setSelectedGroup(g);
    if (filterMode === "ended") {
       const c = courses.find(x => x.course_code === g.course_code);
       if (c && c.end_date) {
         setTargetDate(c.end_date);
       }
    }
    setGroupModalOpen(true);
  };

  const doMarkAttendance = async (student_code: string, slot: string, check_today: boolean) => {
    setBusy(true);
    setError("");
    try {
      await AdminService.markAttendance({ student_code, slot, check_today, attendance_date: targetDate });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to mark attendance");
    } finally {
      setBusy(false);
    }
  };
  
  const doUpdateAttendance = async (attendance_id: number, check_today: boolean) => {
    setBusy(true);
    setError("");
    try {
      await AdminService.updateAttendance(attendance_id, { check_today });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to update attendance");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            {filterMode === "scheduled" ? 
              `Select a course batch scheduled for ${targetDate === getTodayDateString() ? "today" : targetDate} (${currentDayName}) to manage student attendance.` : 
              `View and manage historical attendance for courses that have already ended.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            <button 
              onClick={() => setFilterMode("scheduled")}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterMode === "scheduled" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Active Schedule
            </button>
            <button 
              onClick={() => setFilterMode("ended")}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterMode === "ended" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Ended Courses
            </button>
          </div>
          {filterMode === "scheduled" && (
            <input 
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white font-semibold outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          )}
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search batches by course or ID…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium" />
          </div>
          {error && <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6 bg-slate-50/50">
          {groups.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">{g.course_name}</h3>
                  <div className="text-sm font-medium text-slate-500 mt-1">{g.course_code}</div>
                </div>
                <div className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100 whitespace-nowrap">
                  {g.batch_no || "No Batch"}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center text-sm font-semibold text-slate-600">
                  <Users className="w-4 h-4 mr-2 text-slate-400" />
                  {g.students.length} Student{g.students.length !== 1 ? "s" : ""}
                </div>
                <button
                  onClick={() => openGroup(g)}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
          
          {groups.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <div className="text-slate-400 font-medium">{busy ? "Loading batches..." : q ? "No batches matched your search." : filterMode === "ended" ? "No ended courses found." : `No active batches found on schedule for ${currentDayName}.`}</div>
            </div>
          )}
        </div>
      </div>

      <Modal title={`Attendance: ${selectedGroup?.course_name} (${selectedGroup?.batch_no})`} open={groupModalOpen} onClose={() => setGroupModalOpen(false)}>
        {selectedGroup && (
          <div className="space-y-4 pt-2 relative">
            {busy && (
              <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
              </div>
            )}
            
            <div className="flex justify-between items-center bg-brand-50 border border-brand-100 rounded-xl p-4 mb-4">
              <div>
                <p className="text-xs font-bold text-brand-600 uppercase tracking-wider">Date</p>
                <p className="font-semibold text-brand-900 text-lg mt-0.5">{dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3 sticky left-0 bg-slate-50 z-10">Student name</th>
                    <th className="px-5 py-3">Code</th>
                    {currentSlots.map(slot => (
                      <th key={slot} className="px-5 py-3 text-center border-l border-slate-200">{slot}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedGroup.students.map((stu) => {
                    return (
                      <tr key={stu.student_code} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-bold text-slate-800 sticky left-0 bg-white/95 z-10 min-w-[200px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{stu.student_name}</span>
                            <button
                              onClick={() => {
                                setSelectedStudentName(stu.student_name);
                                setSelectedStudentCode(stu.student_code);
                                setStudentReportOpen(true);
                              }}
                              title="View detailed report"
                              className="p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700 rounded-lg transition-colors border border-brand-200/50 shrink-0"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-500">{stu.student_code}</td>
                        {currentSlots.map(slot => {
                          const record = attendance.find(a => a.user_code === stu.student_code && a.attendance_date.startsWith(targetDate) && a.slot === slot);
                          return (
                            <td key={slot} className="px-5 py-4 border-l border-slate-100 text-center">
                              {record ? (
                                <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                                  {record.check_today ? (
                                    <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-xs border border-emerald-200">
                                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-red-700 bg-red-50 px-2 py-0.5 rounded-md font-bold text-xs border border-red-200">
                                      <XCircle className="w-3.5 h-3.5 mr-1" /> Absent
                                    </span>
                                  )}
                                  <button 
                                    onClick={() => doUpdateAttendance(record.attendance_id, !record.check_today)}
                                    className="text-[10px] text-slate-400 font-semibold hover:text-brand-600 underline"
                                  >
                                    Change
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-center items-center gap-1.5 min-w-[120px]">
                                  <button
                                    onClick={() => doMarkAttendance(stu.student_code, slot, true)}
                                    className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] uppercase font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                                  >
                                    P
                                  </button>
                                  <button
                                    onClick={() => doMarkAttendance(stu.student_code, slot, false)}
                                    className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[10px] uppercase font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                                  >
                                    A
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {selectedGroup.students.length === 0 && (
                    <tr>
                      <td colSpan={2 + currentSlots.length} className="px-5 py-6 text-center text-slate-400">No active students in this batch.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => {
                  if (!selectedGroup) return;
                  const dataToExport = selectedGroup.students.map(stu => {
                    // Try to find status for each slot
                    const row: any = {
                      "Student Name": stu.student_name,
                      "Student Code": stu.student_code
                    };
                    currentSlots.forEach(slot => {
                      const record = attendance.find(a => a.user_code === stu.student_code && a.attendance_date.startsWith(targetDate) && a.slot === slot);
                      row[slot] = record ? (record.check_today ? "Present" : "Absent") : "Not Marked";
                    });
                    return row;
                  });
                  exportToExcel(dataToExport, `Attendance_${selectedGroup.course_code}_${selectedGroup.batch_no}_${targetDate}`, "Attendance");
                }}
                disabled={busy || !selectedGroup || selectedGroup.students.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Batch to Excel
              </button>
              <button
                onClick={() => setGroupModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={`Attendance Detail: ${selectedStudentName}`} open={studentReportOpen} onClose={() => setStudentReportOpen(false)}>
         <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
              <div className="font-semibold text-slate-700">Course: <span className="text-slate-900">{selectedGroup?.course_name}</span></div>
              <div className="font-semibold text-slate-700">
                Total Present: <span className="text-brand-600">{reportRecords.filter(r => r.check_today).length}</span> / {reportRecords.length}
              </div>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[50vh] custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Slot</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {reportRecords.map(r => (
                    <tr key={r.attendance_id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-700 whitespace-nowrap">{r.attendance_date}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium whitespace-nowrap">{r.slot}</td>
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
                     <tr>
                       <td colSpan={3} className="px-5 py-8 text-center text-slate-400 font-medium">No attendance records found for this student during the course timeframe.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStudentReportOpen(false)}
                className="px-5 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
              >
                Close Report
              </button>
            </div>
         </div>
      </Modal>

    </div>
  );
}
