"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminService, AdminStudent, AdminStudentRelations, AdminCourse } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";

import { Plus, Search, Trash2, Pencil, RefreshCw, X, Download } from "lucide-react";
import * as XLSX from "xlsx";

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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-slate-900">{title}</h3>
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

export default function AdminStudentsPage() {
  const router = useRouter();
  const { isAdminOrSales, isAdmin, loading } = useAuth();

  const [rows, setRows] = useState<AdminStudent[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState("");

  const handleError = (e: any, fallback: string) => {
    const d = e?.response?.data?.detail;
    if (Array.isArray(d)) setError(d.map((x: any) => x.msg).join(", "));
    else if (typeof d === "string") setError(d);
    else setError(e?.response?.data?.message || e.message || fallback);
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<AdminStudent | null>(null);
  const [relations, setRelations] = useState<AdminStudentRelations | null>(null);
  const [relationsLoading, setRelationsLoading] = useState(false);

  // Create form
  const [cUsername, setCUsername] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cDob, setCDob] = useState<string>("");
  const [cActive, setCActive] = useState(true);
  const [cDepartment, setCDepartment] = useState("College");

  // Additional Contact Info
  const [cNrc, setCNrc] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cParentName, setCParentName] = useState("");
  const [cParentPhone, setCParentPhone] = useState("");
  const [cAddress, setCAddress] = useState("");

  // Enrollment form integration
  const [cCourseCode, setCCourseCode] = useState("");
  const [cBatchNo, setCBatchNo] = useState("");
  const [cPaymentPlan, setCPaymentPlan] = useState(""); 
  const [cDownpayment, setCDownpayment] = useState<number | "">("");
  const [cInstallment, setCInstallment] = useState<number | "">("");

  // Edit form
  const [eUsername, setEUsername] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eDob, setEDob] = useState<string>("");
  const [eActive, setEActive] = useState(true);

  useEffect(() => {
    if (!loading && !isAdminOrSales) router.replace("/dashboard");
  }, [loading, isAdminOrSales, router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((s) => {
      return (
        s.user_code.toLowerCase().includes(term) ||
        s.username.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    });
  }, [q, rows]);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const [studentData, courseData] = await Promise.all([
        AdminService.listStudents(),
        AdminService.listCourses()
      ]);
      setRows(studentData);
      setCourses(courseData);
    } catch (e: any) {
      handleError(e, "Failed to load data");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdminOrSales) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrSales]);

  const openCreate = () => {
    setCUsername("");
    setCEmail("");
    setCPassword("");
    setCDob("");
    setCActive(true);
    setCDepartment("College");
    setCNrc("");
    setCPhone("");
    setCParentName("");
    setCParentPhone("");
    setCAddress("");
    setCCourseCode("");
    setCBatchNo("");
    setCPaymentPlan("");
    setCDownpayment("");
    setCInstallment("");
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setBusy(true);
    setError("");
    try {
      await AdminService.createStudent({
        username: cUsername.trim(),
        email: cEmail.trim(),
        password: cPassword,
        date_of_birth: cDob,
        is_active: cActive,
        department: cDepartment,
        nrc: cNrc.trim() || null,
        phone: cPhone.trim() || null,
        parent_name: cParentName.trim() || null,
        parent_phone: cParentPhone.trim() || null,
        address: cAddress.trim() || null,
        course_code: cCourseCode || null,
        batch_no: cBatchNo || null,
        payment_plan: cPaymentPlan || null,
        downpayment: cDownpayment !== "" ? Number(cDownpayment) : null,
        installment_amount: cInstallment !== "" ? Number(cInstallment) : null,
      });
      setCreateOpen(false);
      await load();
    } catch (e: any) {
      handleError(e, "Failed to create student");
    } finally {
      setBusy(false);
    }
  };

  const openView = (s: AdminStudent) => {
    setSelected(s);
    setRelations(null);
    setRelationsLoading(true);
    setViewOpen(true);

    AdminService.getStudentRelations(s.user_code)
      .then(setRelations)
      .catch(() => setRelations(null))
      .finally(() => setRelationsLoading(false));
  };

  const openEdit = (s: AdminStudent) => {
    setSelected(s);
    setEUsername(s.username);
    setEEmail(s.email);
    setEDob(s.data_of_birth ? s.data_of_birth.slice(0, 10) : "");
    setEActive(!!s.is_active);
    setRelations(null);
    setRelationsLoading(true);
    setEditOpen(true);

    AdminService.getStudentRelations(s.user_code)
      .then(setRelations)
      .catch(() => setRelations(null))
      .finally(() => setRelationsLoading(false));
  };

  const submitEdit = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.updateUser(selected.user_code, {
        username: eUsername.trim(),
        email: eEmail.trim(),
        date_of_birth: eDob ? eDob : null,
        is_active: eActive,
      });
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (e: any) {
      handleError(e, "Failed to update student");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (s: AdminStudent) => {
    const ok = window.confirm(`Delete student ${s.user_code} (${s.username})? This cannot be undone.`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.deleteUser(s.user_code);
      await load();
    } catch (e: any) {
      handleError(e, "Failed to delete student");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (!isAdminOrSales) return null;

  const exportSelectedStudent = () => {
    if (!selected || !relations) return;
    
    // Sheet 1: Student Information
    const infoData = [{
      "Code": selected.user_code,
      "Name": selected.username,
      "Email": selected.email,
      "DOB": selected.data_of_birth ? selected.data_of_birth.slice(0, 10) : "",
      "Status": selected.is_active ? "Active" : "Inactive",
      "NRC": selected.nrc || "",
      "Phone": selected.phone || "",
      "Address": selected.address || "",
      "Parent Name": selected.parent_name || "",
      "Parent Phone": selected.parent_phone || ""
    }];

    // Sheet 2: Enrollment Info with course cost and left amount
    const enrollmentData = relations.enrollments.map(e => {
      const courseCost = (e as any).course_cost || 0;
      // Sum all payments for this enrollment
      const totalPaid = (relations.payments || [])
        .filter(p => p.enrollment_id === e.enrollment_id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const leftAmount = Math.max(0, courseCost - totalPaid);
      return {
        "Course Code": e.course_code,
        "Course Name": e.course_name,
        "Status": e.status ? "Active" : "Inactive",
        "Batch": e.batch_no || "-",
        "Payment Plan": e.payment_plan === "full" ? "Cash Down" : e.payment_plan === "installment" ? "Installment" : "-",
        "Course Amount (MMK)": courseCost,
        "Downpayment (MMK)": e.downpayment || 0,
        "Installment/Month (MMK)": e.installment_amount || 0,
        "Total Paid (MMK)": totalPaid,
        "Left Amount (MMK)": leftAmount
      };
    });

    // Sheet 3: Payment Receipts Detail with course amount and running left
    let paymentData: any[] = [];
    if (relations.payments && relations.payments.length > 0) {
      // Group total paid per enrollment for computing left
      const paidPerEnrollment: Record<number, number> = {};
      for (const p of relations.payments) {
        paidPerEnrollment[p.enrollment_id] = (paidPerEnrollment[p.enrollment_id] || 0) + (p.amount || 0);
      }
      paymentData = relations.payments.map(p => {
        const courseCost = (p as any).course_cost || 0;
        const totalPaidForEnrollment = paidPerEnrollment[p.enrollment_id] || 0;
        return {
          "Receipt ID": p.payment_id,
          "Date": p.payment_date ? p.payment_date.slice(0, 10) : "-",
          "Course Name": p.course_name,
          "Month": p.month,
          "Method": p.payment_method || "N/A",
          "Course Amount (MMK)": courseCost,
          "Amount Paid (MMK)": p.amount,
          "Total Paid (MMK)": totalPaidForEnrollment,
          "Left Amount (MMK)": Math.max(0, courseCost - totalPaidForEnrollment),
          "Status": p.status
        };
      });
    }

    // Sheet 4: Monthly Payment Summary
    const monthlyMap: Record<string, { totalPaid: number; count: number }> = {};
    if (relations.payments && relations.payments.length > 0) {
      for (const p of relations.payments) {
        const key = p.month || "Unknown";
        if (!monthlyMap[key]) monthlyMap[key] = { totalPaid: 0, count: 0 };
        monthlyMap[key].totalPaid += p.amount || 0;
        monthlyMap[key].count += 1;
      }
    }
    const monthlySummary = Object.entries(monthlyMap).map(([month, v]) => ({
      "Month": month,
      "Total Paid (MMK)": v.totalPaid,
      "No. of Payments": v.count
    }));

    // Sheet 5: Attendance Detail
    const attendanceData = relations.attendance.map(a => ({
      "Date": a.attendance_date,
      "Status": a.check_today ? "Present" : "Absent"
    }));

    const wb = XLSX.utils.book_new();
    
    const wsInfo = XLSX.utils.json_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Student Info");

    const wsEnroll = XLSX.utils.json_to_sheet(enrollmentData.length ? enrollmentData : [{"Info": "No enrollments found"}]);
    XLSX.utils.book_append_sheet(wb, wsEnroll, "Enrollments");

    const wsPayment = XLSX.utils.json_to_sheet(paymentData.length ? paymentData : [{"Info": "No payments recorded"}]);
    XLSX.utils.book_append_sheet(wb, wsPayment, "Payment Receipts");

    const wsMonthlySummary = XLSX.utils.json_to_sheet(monthlySummary.length ? monthlySummary : [{"Info": "No monthly data"}]);
    XLSX.utils.book_append_sheet(wb, wsMonthlySummary, "Monthly Summary");

    const wsAttendance = XLSX.utils.json_to_sheet(attendanceData.length ? attendanceData : [{"Info": "No attendance records"}]);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance Details");

    XLSX.writeFile(wb, `Student_${selected.user_code}_Details.xlsx`);
  };

  const exportAllData = async () => {
    try {
      setBusy(true);
      const [students, enrollments, attendance, payments] = await Promise.all([
        AdminService.listStudents(),
        AdminService.listEnrollments(),
        AdminService.listAttendance(),
        AdminService.listPayments()
      ]);

      const wb = XLSX.utils.book_new();

      const wsStudents = XLSX.utils.json_to_sheet(students.length ? students.map(s => ({
        "User Code": s.user_code,
        "Name": s.username,
        "Email": s.email,
        "DOB": s.data_of_birth ? s.data_of_birth.slice(0, 10) : "-",
        "Status": s.is_active ? "Active" : "Inactive",
        "NRC": s.nrc || "-",
        "Phone": s.phone || "-",
        "Address": s.address || "-",
        "Parent": s.parent_name || "-",
        "Parent Phone": s.parent_phone || "-"
      })) : [{"Info": "No students recorded"}]);
      XLSX.utils.book_append_sheet(wb, wsStudents, "All Students");

      // Compute total paid per enrollment for left amount
      const paidPerEnrollment: Record<number, number> = {};
      for (const p of payments) {
        paidPerEnrollment[p.enrollment_id] = (paidPerEnrollment[p.enrollment_id] || 0) + (p.amount || 0);
      }

      const wsPayments = XLSX.utils.json_to_sheet(payments.length ? payments.map(p => {
        const courseCost = p.course_cost || 0;
        const totalPaidForEnroll = paidPerEnrollment[p.enrollment_id] || 0;
        return {
          "Receipt ID": p.payment_id,
          "Student Code": p.student_code,
          "Student Name": p.student_name,
          "Course Name": p.course_name,
          "Month": p.month,
          "Method": p.payment_method || "-",
          "Date": p.payment_date ? p.payment_date.slice(0, 10) : "-",
          "Course Amount (MMK)": courseCost,
          "Amount Paid (MMK)": p.amount,
          "Total Paid (MMK)": totalPaidForEnroll,
          "Left Amount (MMK)": Math.max(0, courseCost - totalPaidForEnroll),
          "Status": p.status
        };
      }) : [{"Info": "No payments recorded"}]);
      XLSX.utils.book_append_sheet(wb, wsPayments, "All Payments");

      // Monthly Summary across the entire system
      const monthlyMap: Record<string, { totalPaid: number; count: number }> = {};
      for (const p of payments) {
        const key = p.month || "Unknown";
        if (!monthlyMap[key]) monthlyMap[key] = { totalPaid: 0, count: 0 };
        monthlyMap[key].totalPaid += p.amount || 0;
        monthlyMap[key].count += 1;
      }
      const monthlySummary = Object.entries(monthlyMap).map(([month, v]) => ({
        "Month": month,
        "Total Paid (MMK)": v.totalPaid,
        "No. of Payments": v.count
      }));
      const wsMonthlySummary = XLSX.utils.json_to_sheet(monthlySummary.length ? monthlySummary : [{"Info": "No monthly data"}]);
      XLSX.utils.book_append_sheet(wb, wsMonthlySummary, "Monthly Summary");

      const wsEnrollments = XLSX.utils.json_to_sheet(enrollments.length ? enrollments.map(e => {
        const courseCost = e.course_cost || 0;
        const totalPaid = paidPerEnrollment[e.enrollment_id] || 0;
        return {
          "Enrollment ID": e.enrollment_id,
          "Student Name": e.student_name,
          "Course Name": e.course_name,
          "Batch": e.batch_no || "-",
          "Plan": e.payment_plan || "-",
          "Course Amount (MMK)": courseCost,
          "Downpayment (MMK)": e.downpayment || 0,
          "Installment/Month (MMK)": e.installment_amount || 0,
          "Total Paid (MMK)": totalPaid,
          "Left Amount (MMK)": Math.max(0, courseCost - totalPaid),
          "Status": e.status ? "Active" : "Inactive"
        };
      }) : [{"Info": "No enrollments found"}]);
      XLSX.utils.book_append_sheet(wb, wsEnrollments, "All Enrollments");

      const wsAttendance = XLSX.utils.json_to_sheet(attendance.length ? attendance.map(a => ({
        "Date": a.attendance_date,
        "Student Name": a.username,
        "Slot": a.slot,
        "Status": a.check_today ? "Present" : "Absent"
      })) : [{"Info": "No attendance records"}]);
      XLSX.utils.book_append_sheet(wb, wsAttendance, "All Attendance");

      XLSX.writeFile(wb, `System_Backup_Data_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e: any) {
      handleError(e, "Failed to aggregate export data");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Create, update, and delete student accounts.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const link = `${window.location.origin}/register`;
              if (navigator.share) {
                navigator.share({
                  title: 'NiT Student Registration',
                  text: 'Please register using this link:',
                  url: link,
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(link).then(() => alert("Registration link copied to clipboard!"));
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-100 shadow-sm"
          >
            Share/Copy Register Link
          </button>
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportAllData}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          {isAdmin && (
            <button
              onClick={async () => {
                const ok = window.confirm("This will DELETE all data (students/courses/enrollments/attendance/rooms/etc.) except admin accounts. Continue?");
                if (!ok) return;
                try {
                  setBusy(true);
                  setError("");
                  await AdminService.purgeData();
                  await load();
                } catch (e: any) {
                  handleError(e, "Failed to purge data");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-sm disabled:opacity-60"
            >
              Purge data
            </button>
          )}
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by code, name, or email…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium"
            />
          </div>
          {error && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Code</th>
                <th className="px-6 py-4">Pic</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">DOB</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((s) => (
                <tr key={s.user_code} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{s.user_code}</td>
                  <td className="px-6 py-4">
                    {s.profile_picture ? (
                      <div className="relative group w-8 h-8">
                        <img src={s.profile_picture} alt="Profile" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shadow-sm" />
                        <a href={s.profile_picture} download={`pic_${s.user_code}`} className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Download Image" onClick={e => e.stopPropagation()}>
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                        {s.username?.[0] || "?"}
                      </div>
                    )}
                  </td>
                  <td 
                    className="px-6 py-4 font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer" 
                    onClick={() => openView(s)}
                  >
                    {s.username}
                  </td>
                  <td className="px-6 py-4">{s.email}</td>
                  <td className="px-6 py-4">{s.data_of_birth ? s.data_of_birth.slice(0, 10) : "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={[
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                        s.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200",
                      ].join(" ")}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {isAdmin && (
<button
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
)}
                      {isAdmin && (
                      <button
                        onClick={() => doDelete(s)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No students found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title="Create Student" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
            <input
              value={cUsername}
              onChange={(e) => setCUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Student name"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              value={cEmail}
              onChange={(e) => setCEmail(e.target.value)}
              type="email"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="student@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              value={cPassword}
              onChange={(e) => setCPassword(e.target.value)}
              type="password"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of birth</label>
            <input
              value={cDob}
              onChange={(e) => setCDob(e.target.value)}
              type="date"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">NRC</label>
            <input
              value={cNrc}
              onChange={(e) => setCNrc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. 12/DaGaMa(N)123456"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
            <input
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. 0912345678"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
            <select
              value={cDepartment}
              onChange={(e) => setCDepartment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium cursor-pointer"
            >
              <option value="College">College (CO)</option>
              <option value="Institute">Institute (IN)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
            <input
              value={cAddress}
              onChange={(e) => setCAddress(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Full address details"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Name</label>
            <input
              value={cParentName}
              onChange={(e) => setCParentName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. U Kyaw"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Phone</label>
            <input
              value={cParentPhone}
              onChange={(e) => setCParentPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. 0987654321"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={cActive}
                onChange={(e) => setCActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
          </div>

          {/* New Enrollment Block */}
          <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3">Course Enrollment (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Course</label>
                <select
                  value={cCourseCode}
                  onChange={(e) => setCCourseCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">No course (skip enrollment)</option>
                  {courses.map(c => (
                    <option key={c.course_code} value={c.course_code}>{c.course_name}</option>
                  ))}
                </select>
              </div>

              {cCourseCode && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch No</label>
                    <input
                      type="text"
                      value={cBatchNo}
                      onChange={(e) => setCBatchNo(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="e.g. Batch 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Plan</label>
                    <select
                      value={cPaymentPlan}
                      onChange={(e) => setCPaymentPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="">Select Plan...</option>
                      <option value="full">Full Payment</option>
                      <option value="installment">Installment</option>
                    </select>
                  </div>
                  
                  {cPaymentPlan === "installment" && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deposit (Optional, MMK)</label>
                        <input
                          type="number"
                          value={cDownpayment}
                          onChange={(e) => setCDownpayment(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          placeholder="e.g. 2000000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Installment (MMK)</label>
                        <input
                          type="number"
                          value={cInstallment}
                          onChange={(e) => setCInstallment(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          placeholder="e.g. 300000"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {/* End New Enrollment Block */}

          <div className="sm:col-span-2 flex justify-end">
            <button
              onClick={submitCreate}
              disabled={busy || !cUsername.trim() || !cEmail.trim() || cPassword.length < 6 || !cDob}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60"
            >
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal title={`Edit Student${selected ? ` — ${selected.user_code}` : ""}`} open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
            <input
              value={eUsername}
              onChange={(e) => setEUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              value={eEmail}
              onChange={(e) => setEEmail(e.target.value)}
              type="email"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of birth</label>
            <input
              value={eDob}
              onChange={(e) => setEDob(e.target.value)}
              type="date"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1">
              <input
                type="checkbox"
                checked={eActive}
                onChange={(e) => setEActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
          </div>

          <div className="sm:col-span-2">
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-800">Relations</div>
                {relationsLoading && <div className="text-xs font-semibold text-slate-500">Loading…</div>}
              </div>
              {!relationsLoading && relations && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">Enrollments</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-1">{relations.enrollments.length}</div>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">Attendance</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-1">{relations.attendance.length}</div>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">Parents</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-1">{relations.parents.length}</div>
                  </div>
                </div>
              )}
              {!relationsLoading && !relations && (
                <div className="mt-2 text-sm text-slate-500 font-medium">No relation data available.</div>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setEditOpen(false)}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submitEdit}
              disabled={busy || !selected}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Student Details" open={viewOpen} onClose={() => setViewOpen(false)}>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6 items-start bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
                {selected.profile_picture ? (
                  <>
                    <img src={selected.profile_picture} alt="Profile" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white shadow-sm" />
                    <a href={selected.profile_picture} download={`pic_${selected.user_code}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 shadow-sm">
                      <Download className="w-3.5 h-3.5" />
                      Download Pic
                    </a>
                  </>
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-200 border-4 border-white shadow-sm flex items-center justify-center text-4xl font-bold text-slate-400 uppercase">
                    {selected.username?.[0] || "?"}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Student Code</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.user_code}</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Full Name</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.username}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Email</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.email}</div>
                </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.data_of_birth ? selected.data_of_birth.slice(0, 10) : "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Status</div>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${selected.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                    {selected.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="col-span-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">NRC</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.nrc || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Phone Number</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.phone || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Address</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.address || "-"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Parent Name</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.parent_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Parent Phone</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.parent_phone || "-"}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Enrollments & Payment Info</div>
                {relationsLoading && <div className="text-xs font-semibold text-slate-400">Loading...</div>}
              </div>
              {!relationsLoading && relations && relations.enrollments.length > 0 ? (
                <div className="space-y-3">
                  {relations.enrollments.map((enr, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>{enr.course_name || enr.course_code}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${enr.status ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {enr.status ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm grid grid-cols-2 gap-2 text-slate-600">
                        <div><span className="font-semibold text-slate-500">Batch:</span> {enr.batch_no || "-"}</div>
                        <div><span className="font-semibold text-slate-500">Plan:</span> {enr.payment_plan === "full" ? "Cash Down" : enr.payment_plan === "installment" ? "Installment" : "-"}</div>
                        {enr.payment_plan === "installment" && (
                          <>
                            <div><span className="font-semibold text-slate-500">Downpayment:</span> {enr.downpayment ? `${enr.downpayment} MMK` : "-"}</div>
                            <div><span className="font-semibold text-slate-500">Monthly:</span> {enr.installment_amount ? `${enr.installment_amount} MMK` : "-"}</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !relationsLoading && relations && relations.enrollments.length === 0 ? (
                <div className="text-sm font-medium text-slate-500">No enrollments found for this student.</div>
              ) : null}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Payment Receipts</div>
                {relationsLoading && <div className="text-xs font-semibold text-slate-400">Loading...</div>}
              </div>
              {!relationsLoading && relations && relations.payments && relations.payments.length > 0 ? (
                <div className="space-y-3">
                  {relations.payments.map((p, i) => (
                    <div key={`pay-${i}`} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>{p.course_name} ({p.month})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${p.status?.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {p.status || "Unknown"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm grid grid-cols-2 gap-2 text-slate-600">
                        <div><span className="font-semibold text-slate-500">Method:</span> {p.payment_method || "-"}</div>
                        <div><span className="font-semibold text-slate-500">Amount:</span> {p.amount.toLocaleString()} MMK</div>
                        <div><span className="font-semibold text-slate-500">Date:</span> {p.payment_date ? p.payment_date.slice(0, 10) : "-"}</div>
                        <div><span className="font-semibold text-slate-500">Receipt ID:</span> #{p.payment_id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !relationsLoading && relations && (!relations.payments || relations.payments.length === 0) ? (
                <div className="text-sm font-medium text-slate-500">No payment receipts found for this student.</div>
              ) : null}
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={exportSelectedStudent}
                disabled={relationsLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
              <button
                onClick={() => setViewOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

