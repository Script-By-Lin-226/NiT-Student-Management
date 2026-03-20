"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminCourse, AdminEnrollment, AdminService } from "@/services/admin.service";
import { Plus, Search, Trash2, Pencil, RefreshCw, X } from "lucide-react";

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

  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [rows, setRows] = useState<AdminEnrollment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminEnrollment | null>(null);

  const [cStudentCode, setCStudentCode] = useState("");
  const [cCourseCode, setCCourseCode] = useState("");
  const [cStatus, setCStatus] = useState(true);
  const [cBatchNo, setCBatchNo] = useState("");
  const [cPaymentPlan, setCPaymentPlan] = useState("");
  const [cDownpayment, setCDownpayment] = useState<number | "">("");
  const [cInstallment, setCInstallment] = useState<number | "">("");

  const [eStatus, setEStatus] = useState(true);
  const [eBatchNo, setEBatchNo] = useState("");
  const [ePaymentPlan, setEPaymentPlan] = useState("");
  const [eDownpayment, setEDownpayment] = useState<number | "">("");
  const [eInstallment, setEInstallment] = useState<number | "">("");


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

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const [cs, es] = await Promise.all([AdminService.listCourses(), AdminService.listEnrollments()]);
      setCourses(cs);
      setRows(es);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to load enrollments");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdminOrSales) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrSales]);

  if (loading) return null;
  if (!isAdminOrSales) return null;

  const openCreate = () => {
    setCStudentCode("");
    setCCourseCode(courses[0]?.course_code ?? "");
    setCStatus(true);
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
      await AdminService.createEnrollment({
        student_code: cStudentCode.trim(),
        course_code: cCourseCode.trim(),
        status: cStatus,
        batch_no: cBatchNo.trim() || null,
        payment_plan: cPaymentPlan || null,
        downpayment: cDownpayment !== "" ? Number(cDownpayment) : null,
        installment_amount: cInstallment !== "" ? Number(cInstallment) : null,
      });
      setCreateOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to create enrollment");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (e: AdminEnrollment) => {
    setSelected(e);
    setEStatus(!!e.status);
    setEBatchNo(e.batch_no || "");
    setEPaymentPlan(e.payment_plan || "");
    setEDownpayment(e.downpayment ?? "");
    setEInstallment(e.installment_amount ?? "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.updateEnrollment(selected.enrollment_code, { 
        status: eStatus,
        batch_no: eBatchNo.trim() || null,
        payment_plan: ePaymentPlan || null,
        downpayment: eDownpayment !== "" ? Number(eDownpayment) : null,
        installment_amount: eInstallment !== "" ? Number(eInstallment) : null,
      });
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to update enrollment");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (e: AdminEnrollment) => {
    const ok = window.confirm(`Delete enrollment ${e.enrollment_code}?`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.deleteEnrollment(e.enrollment_code);
      await load();
    } catch (er: any) {
      setError(er?.response?.data?.detail || er?.response?.data?.message || "Failed to delete enrollment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enrollments</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Enroll students into courses and manage enrollment status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm">
            <Plus className="w-4 h-4" />
            New Enrollment
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by enrollment code…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium" />
          </div>
          {error && <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Room</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((e) => (
                <tr key={e.enrollment_code} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{e.enrollment_code}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{(e as any).student_name || "-"}</div>
                    <div className="text-xs text-slate-500 font-medium">{(e as any).student_code || `ID ${e.student_id}`}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{(e as any).course_name || "-"}</div>
                    <div className="text-xs text-slate-500 font-medium">{(e as any).course_code || `ID ${e.course_id}`}</div>
                  </td>
                  <td className="px-6 py-4">{(e as any).room || "-"}</td>
                  <td className="px-6 py-4">{e.enrollment_date ? e.enrollment_date.split(" ")[0] : "-"}</td>
                  <td className="px-6 py-4">
                    <span className={["inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border", e.status ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"].join(" ")}>
                      {e.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {isAdmin && (
<button onClick={() => openEdit(e)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50">
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
)}
                      {isAdmin && (
                      <button onClick={() => doDelete(e)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-50">
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
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No enrollments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch No (Important for Attendance)</label>
            <input value={cBatchNo} onChange={(e) => setCBatchNo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. Batch 1" />
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
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch No</label>
            <input value={eBatchNo} onChange={(e) => setEBatchNo(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. Batch 1" />
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
    </div>
  );
}

