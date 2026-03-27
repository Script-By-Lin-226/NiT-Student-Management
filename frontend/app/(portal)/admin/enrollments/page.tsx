"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminCourse, AdminEnrollment, AdminService } from "@/services/admin.service";
import { Search, Plus, Pencil, Trash2, RefreshCw, X, Download, AlertCircle, LayoutGrid, List } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import { exportToExcel } from "@/utils/excelExport";
import { useCreateEnrollment, useUpdateEnrollment, useDeleteEnrollment, useCourses, useEnrollments, useBatches } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { formatAmount } from "@/utils/format";


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
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminEnrollmentsPage() {
  const router = useRouter();
  const { isAdminOrSales, isAdmin, loading } = useAuth();

  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: rows = [], isLoading: enrollmentsLoading, refetch: reload } = useEnrollments();

  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminEnrollment | null>(null);
  const [enrollToDelete, setEnrollToDelete] = useState<AdminEnrollment | null>(null);

  const createMutation = useCreateEnrollment();
  const deleteMutation = useDeleteEnrollment();
  const busy = coursesLoading || enrollmentsLoading || createMutation.isPending || deleteMutation.isPending;

  const [cStudentCode, setCStudentCode] = useState("");
  const [cCourseCode, setCCourseCode] = useState("");
  const [cStatus, setCStatus] = useState(true);
  const [cBatchNo, setCBatchNo] = useState("");
  const [cBatchId, setCBatchId] = useState<number | "">(0);
  const [cPaymentPlan, setCPaymentPlan] = useState("");
  const [cDownpayment, setCDownpayment] = useState<number | "">(0);
  const [cInstallment, setCInstallment] = useState<number | "">(0);

  const [eStatus, setEStatus] = useState(true);
  const [eBatchNo, setEBatchNo] = useState("");
  const [eBatchId, setEBatchId] = useState<number | "">(0);
  const [ePaymentPlan, setEPaymentPlan] = useState("");
  const [eDownpayment, setEDownpayment] = useState<number | "">(0);
  const [eInstallment, setEInstallment] = useState<number | "">(0);

  const updateMutation = useUpdateEnrollment();

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.course_code === cCourseCode);
  }, [cCourseCode, courses]);

  const { data: cBatchesFull } = useBatches(selectedCourse?.course_id);
  const cBatches = cBatchesFull?.data || [];

  const { data: eBatchesFull } = useBatches(selected?.course_id);
  const eBatches = eBatchesFull?.data || [];


  useEffect(() => {
    if (!loading && !isAdminOrSales) router.replace("/dashboard");
  }, [loading, isAdminOrSales, router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((e: any) => {
      return (
        e.enrollment_code.toLowerCase().includes(term) ||
        String(e.student_id).includes(term) ||
        String(e.course_id).includes(term) ||
        (e.student_code || "").toLowerCase().includes(term) ||
        (e.student_name || "").toLowerCase().includes(term) ||
        (e.course_code || "").toLowerCase().includes(term) ||
        (e.course_name || "").toLowerCase().includes(term) ||
        (e.room || "").toLowerCase().includes(term)
      );
    });
  }, [q, rows]);

  useEffect(() => {
    if (isAdminOrSales) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrSales]);

  if (loading) return null;
  if (!isAdminOrSales) return null;

  const openCreate = () => {
    setCStudentCode("");
    setCCourseCode(courses[0]?.course_code ?? "");
    setCStatus(true);
    setCBatchNo("");
    setCBatchId(0);
    setCPaymentPlan("");
    setCDownpayment(0);
    setCInstallment(0);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    try {
      await createMutation.mutateAsync({
        student_code: cStudentCode.trim(),
        course_code: cCourseCode.trim(),
        status: cStatus,
        batch_no: cBatchNo.trim() || null,
        batch_id: cBatchId !== "" ? Number(cBatchId) : null,
        payment_plan: cPaymentPlan || null,
        downpayment: cDownpayment !== "" ? Number(cDownpayment) : null,
        installment_amount: cInstallment !== "" ? Number(cInstallment) : null,
      });
      setCreateOpen(false);
      reload();
      toast.success("Enrollment created");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create enrollment");
    }
  };

  const openEdit = (e: AdminEnrollment) => {
    setSelected(e);
    setEStatus(e.status);
    setEBatchNo(e.batch_no || "");
    setEBatchId(e.batch_id || "");
    setEPaymentPlan(e.payment_plan || "");
    setEDownpayment(e.downpayment || "");
    setEInstallment(e.installment_amount || "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected) return;
    try {
      await updateMutation.mutateAsync({
        code: selected.enrollment_code,
        payload: {
          status: eStatus,
          batch_no: eBatchNo.trim() || null,
          batch_id: eBatchId !== "" ? Number(eBatchId) : null,
          payment_plan: ePaymentPlan || null,
          downpayment: eDownpayment !== "" ? Number(eDownpayment) : null,
          installment_amount: eInstallment !== "" ? Number(eInstallment) : null,
        },
      });
      setEditOpen(false);
      setSelected(null);
      reload();
      toast.success("Enrollment updated");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update enrollment");
    }
  };

  const doDelete = async (e: AdminEnrollment) => {
    setEnrollToDelete(e);
  };

  const executeDelete = async () => {
    if (!enrollToDelete) return;
    try {
      await deleteMutation.mutateAsync(enrollToDelete.enrollment_code);
      reload();
      toast.success("Enrollment deleted");
    } catch (er: any) {
      toast.error(er?.response?.data?.message || "Failed to delete enrollment");
    } finally {
      setEnrollToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enrollments</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Enroll students into courses and manage enrollment status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => reload()} disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-60 text-sm transition-all active:scale-95">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              const dataToExport = filtered.map(e => ({
                "Enrollment Code": e.enrollment_code,
                "Student Name": (e as any).student_name || "-",
                "Student Code": (e as any).student_code || "-",
                "Course Name": (e as any).course_name || "-",
                "Course Code": (e as any).course_code || "-",
                "Course Cost (MMK)": (e as any).course_cost || 0,
                "Batch": e.batch_no || "-",
                "Payment Plan": e.payment_plan || "-",
                "Deposit (MMK)": e.downpayment || 0,
                "Monthly Installment (MMK)": e.installment_amount || 0,
                "FOC Items": (e as any).foc_items || "-",
                "Status": e.status ? "Active" : "Inactive",
                "Date": e.enrollment_date ? e.enrollment_date.split(" ")[0] : "-"
              }));
              exportToExcel(dataToExport, "Enrollments_List", "Enrollments");
            }}
            disabled={busy || filtered.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-all active:scale-95 text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Export</span>
          </button>
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm transition-all active:scale-95 text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            <span>New Enrollment</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by student or course…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium text-sm sm:text-base" />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((e) => (
                <tr key={e.enrollment_code} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-brand-600">{e.enrollment_code}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {e.profile_picture ? (
                        <img src={e.profile_picture} alt="Profile" className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                          {e.student_name?.[0] || "?"}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{e.student_name || "-"}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{e.student_code || `ID ${e.student_id}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{(e as any).course_name || "-"}</div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{(e as any).course_code || `ID ${e.course_id}`}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{e.batch_no || "-"}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Room: {(e as any).room || "-"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 uppercase tracking-tighter text-xs">{e.payment_plan || "-"}</div>
                    {e.payment_plan === "installment" && (
                      <div className="text-[10px] text-slate-400 font-bold">Res: {formatAmount(e.installment_amount)} MMK</div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">{e.enrollment_date ? e.enrollment_date.split(" ")[0] : "-"}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={["inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm", e.status ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"].join(" ")}>
                      {e.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      {isAdmin && (
                        <button onClick={() => openEdit(e)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all active:scale-90 shadow-sm">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => doDelete(e)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-90 shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No enrollments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filtered.map((e) => (
            <div key={e.enrollment_code} className="p-4 bg-white hover:bg-slate-50/50 transition-colors space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {e.profile_picture ? (
                    <img src={e.profile_picture} alt="Profile" className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                      {e.student_name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{e.enrollment_code}</div>
                    <div className="text-base font-bold text-slate-900 leading-tight">{e.student_name || "Unknown Student"}</div>
                    <div className="text-xs text-slate-500 font-medium">{e.student_code || `ID ${e.student_id}`}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={["inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", e.status ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"].join(" ")}>
                    {e.status ? "Active" : "Inactive"}
                  </span>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button onClick={() => openEdit(e)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200 transition-all active:scale-90" title="Edit">
                          <Pencil className="w-5 h-5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => doDelete(e)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100 transition-all active:scale-90" title="Delete">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Enrolled Course</div>
                  <div className="font-bold text-slate-800">{(e as any).course_name || "-"}</div>
                  <div className="text-xs text-slate-500 font-medium">{(e as any).course_code || `ID ${e.course_id}`} • Room: {(e as any).room || "-"}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Date</div>
                    <div className="font-semibold text-slate-700">
                      {e.enrollment_date ? e.enrollment_date.split(" ")[0] : "-"}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Batch</div>
                    <div className="font-semibold text-slate-700 truncate">
                      {e.batch_no || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              {busy ? "Loading…" : "No enrollments found."}
            </div>
          )}
        </div>

      </div>

      <Modal title="Create Enrollment" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Student code</label>
            <input value={cStudentCode} onChange={(e) => setCStudentCode(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="STU0001" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course code</label>
            <input value={cCourseCode} onChange={(e) => setCCourseCode(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="CRS0001" list="courseCodes" />
            <datalist id="courseCodes">
              {courses.map((c) => (
                <option key={c.course_code} value={c.course_code} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Batch (Populated from Course)</label>
            <select 
              value={cBatchId} 
              onChange={(e) => {
                const val = e.target.value;
                setCBatchId(val ? Number(val) : "");
                const b = cBatches.find(x => x.batch_id === Number(val));
                setCBatchNo(b?.batch_no || "");
              }} 
              disabled={!cCourseCode}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50"
            >
              <option value="">-- Select Batch --</option>
              {cBatches.map(b => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_no} ({b.start_date || "N/A"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Plan</label>
            <select value={cPaymentPlan} onChange={(e) => setCPaymentPlan(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Select Plan...</option>
              <option value="full">Full Payment</option>
              <option value="installment">Installment</option>
            </select>
          </div>
          
          {cPaymentPlan === "installment" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deposit Amount (MMK)</label>
                <input type="number" value={cDownpayment} onChange={(e) => setCDownpayment(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. 50000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Installment (MMK)</label>
                <input type="number" value={cInstallment} onChange={(e) => setCInstallment(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. 30000" />
              </div>
            </>
          )}

          <div className="sm:col-span-2 flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={cStatus} onChange={(e) => setCStatus(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Active
            </label>
            <button onClick={submitCreate} disabled={busy || !cStudentCode.trim() || !cCourseCode.trim()} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60">
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal title={`Edit Enrollment${selected ? ` — ${selected.enrollment_code}` : ""}`} open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch</label>
            <select 
              value={eBatchId} 
              onChange={(e) => {
                const val = e.target.value;
                setEBatchId(val ? Number(val) : "");
                const b = eBatches.find(x => x.batch_id === Number(val));
                setEBatchNo(b?.batch_no || "");
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Select Batch --</option>
              {eBatches.map(b => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_no} ({b.start_date || "N/A"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Plan</label>
            <select value={ePaymentPlan} onChange={(e) => setEPaymentPlan(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Select Plan...</option>
              <option value="full">Full Payment</option>
              <option value="installment">Installment</option>
            </select>
          </div>
          
          {ePaymentPlan === "installment" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deposit Amount (MMK)</label>
                <input type="number" value={eDownpayment} onChange={(e) => setEDownpayment(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. 50000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Installment (MMK)</label>
                <input type="number" value={eInstallment} onChange={(e) => setEInstallment(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. 30000" />
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={eStatus} onChange={(e) => setEStatus(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Active
            </label>
          </div>
          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={submitEdit} disabled={busy || !selected} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60">
              Save changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal 
        open={!!enrollToDelete}
        onClose={() => setEnrollToDelete(null)}
        onConfirm={executeDelete}
        title="Delete Enrollment"
        message={`Are you sure you want to delete enrollment ${enrollToDelete?.enrollment_code}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
