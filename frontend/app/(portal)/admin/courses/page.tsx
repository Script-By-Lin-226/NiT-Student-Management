"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminAcademicYear, AdminCourse, AdminService } from "@/services/admin.service";
import { Plus, Search, Trash2, Pencil, RefreshCw, X, Download, Layers, BookOpen } from "lucide-react";
import { exportToExcel } from "@/utils/excelExport";
import { useCourses, useAcademicYears, useCreateCourse, useUpdateCourse, useDeleteCourse, useBatches, useCreateBatch, useUpdateBatch, useDeleteBatch, useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { formatAmount } from "@/utils/format";
import ConfirmModal from "@/components/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";


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

export default function AdminCoursesPage() {
  const router = useRouter();
  const { isAdminOrSales, isAdmin, loading: authLoading } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: years = [], isLoading: yearsLoading } = useAcademicYears();
  const { data: coursesResponse, isLoading: coursesLoading, refetch: reload } = useCourses(page, limit);
  const rows = coursesResponse?.data || [];
  const pagination = coursesResponse?.pagination;
  
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [selected, setSelected] = useState<AdminCourse | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<AdminCourse | null>(null);

  // Form states... (keeping them as they are for simplicity in replacement, but I'll optimize if needed)
  const [cName, setCName] = useState("");
  const [cYearId, setCYearId] = useState<number | "">("");
  const [cInstructor, setCInstructor] = useState("");
  const [cFeeFull, setCFeeFull] = useState<number | "">(0);
  const [cFeeInst, setCFeeInst] = useState<number | "">(0);
  const [cExamFeeGbp, setCExamFeeGbp] = useState<number | "">(0);
  const [cFocItems, setCFocItems] = useState("");
  const [cCategory, setCCategory] = useState("");

  const [eName, setEName] = useState("");
  const [eYearId, setEYearId] = useState<number | "">("");
  const [eInstructor, setEInstructor] = useState("");
  const [eFeeFull, setEFeeFull] = useState<number | "">("");
  const [eFeeInst, setEFeeInst] = useState<number | "">("");
  const [eExamFeeGbp, setEExamFeeGbp] = useState<number | "">("");
  const [eFocItems, setEFocItems] = useState("");
  const [eCategory, setECategory] = useState("");

  const busy = yearsLoading || coursesLoading || createCourse.isPending || updateCourse.isPending || deleteCourse.isPending;

  useEffect(() => {
    if (!authLoading && !isAdminOrSales) router.replace("/dashboard");
  }, [authLoading, isAdminOrSales, router]);

  const yearNameById = useMemo(() => {
    const m = new Map<number, string>();
    years.forEach((y) => m.set(y.academic_year_id, y.academic_year_name));
    return m;
  }, [years]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((c: AdminCourse) => c.course_code.toLowerCase().includes(term) || c.course_name.toLowerCase().includes(term));
  }, [q, rows]);

  if (authLoading) return null;
  if (!isAdminOrSales) return null;

  const openCreate = () => {
    setCName(""); setCInstructor(""); setCFeeFull(0); setCFeeInst(0); setCExamFeeGbp(0);
    setCFocItems("");
    setCCategory("");
    setCYearId(years[0]?.academic_year_id ?? "");
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (cYearId === "") return;
    try {
      await createCourse.mutateAsync({
        course_name: cName.trim(),
        academic_year_id: cYearId,
        instructor_user_code: cInstructor.trim() ? cInstructor.trim() : null,
        fee_full_payment: cFeeFull !== "" ? Number(cFeeFull) : null,
        fee_installment: cFeeInst !== "" ? Number(cFeeInst) : null,
        exam_fee_gbp: cExamFeeGbp !== "" ? Number(cExamFeeGbp) : undefined,
        foc_items: cFocItems.trim() || undefined,
        category: cCategory.trim() || undefined,
      });
      setCreateOpen(false);
      toast.success("Course created successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create course");
    }
  };

  const openEdit = (c: AdminCourse) => {
    setSelected(c);
    setEName(c.course_name); setEYearId(c.academic_year_id); setEInstructor(""); setEFeeFull(c.fee_full_payment ?? ""); setEFeeInst(c.fee_installment ?? "");
      setEExamFeeGbp(c.exam_fee_gbp || "");
      setEFocItems(c.foc_items || "");
      setECategory(c.category || "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected || eYearId === "") return;
    try {
      await updateCourse.mutateAsync({
        code: selected.course_code,
        payload: {
          course_name: eName.trim(),
          academic_year_id: eYearId,
          instructor_user_code: eInstructor.trim() ? eInstructor.trim() : null,
          fee_full_payment: eFeeFull !== "" ? Number(eFeeFull) : null,
          fee_installment: eFeeInst !== "" ? Number(eFeeInst) : null,
          exam_fee_gbp: eExamFeeGbp !== "" ? Number(eExamFeeGbp) : undefined,
          foc_items: eFocItems.trim() || undefined,
          category: eCategory.trim() || undefined,
        }
      });
      setEditOpen(false);
      toast.success("Course updated successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update course");
    }
  };

  const doDelete = async (c: AdminCourse) => {
    setCourseToDelete(c);
  };

  const executeDelete = async () => {
    if (!courseToDelete) return;
    try {
      await deleteCourse.mutateAsync(courseToDelete.course_code);
      toast.success("Course deleted successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete course");
    } finally {
      setCourseToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Courses</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Create, update, and delete courses.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => reload()} disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-60 text-sm transition-all active:scale-95">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              const dataToExport = filtered.map(c => ({
                "Course Code": c.course_code,
                "Course Name": c.course_name,
                "Category": c.category || "-",
                "Full Fee (MMK)": c.fee_full_payment || 0,
                "Installment Fee (MMK)": c.fee_installment || 0,
                "Exam Fee (GBP)": c.exam_fee_gbp || 0,
                "Academic Year": yearNameById.get(c.academic_year_id) || "-",
                "Instructor ID": c.instructor_id || "-",
                "FOC Items": c.foc_items || "-",
              }));
              exportToExcel(dataToExport, "Courses_List", "Courses");
            }}
            disabled={busy || filtered.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-all active:scale-95 text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Export</span>
          </button>
          <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm transition-all active:scale-95 text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
            <span>New Course</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code or name…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium text-sm sm:text-base" />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Fees (MMK)</th>
                <th className="px-6 py-4">Academic Year</th>
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((c) => (
                <tr key={c.course_code} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 cursor-pointer" onClick={() => { setSelected(c); setSubjectOpen(true); }}>
                    <div className="font-bold text-brand-600 group-hover:underline underline-offset-4 decoration-brand-200 transition-all">{c.course_code}</div>
                    <div className="font-bold text-slate-900 text-base">{c.course_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 w-8">Full</span>
                        <span className="font-bold text-slate-900">{formatAmount(c.fee_full_payment)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 w-8">Inst</span>
                        <span className="font-bold text-slate-700">{formatAmount(c.fee_installment)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">{yearNameById.get(c.academic_year_id) || `#${c.academic_year_id}`}</td>
                  <td className="px-6 py-4 font-bold text-slate-700">{c.instructor_id ?? "-"}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-brand-50 text-brand-700 border border-brand-100 uppercase tracking-widest shadow-sm">
                      {c.category || "General"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2 text-xs">
                      <button onClick={() => { setSelected(c); setBatchOpen(true); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all active:scale-90 shadow-sm" title="Manage Batches">
                        <Layers className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelected(c); setSubjectOpen(true); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-sm" title="Manage Subjects">
                        <BookOpen className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => openEdit(c)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-all active:scale-90 shadow-sm" title="Edit Course">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => doDelete(c)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-90 shadow-sm" title="Delete Course">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No courses found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filtered.map((c) => (
            <div key={c.course_code} className="p-4 bg-white hover:bg-slate-50/50 transition-colors space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{c.course_code}</div>
                  <div className="text-base font-bold text-slate-900 leading-tight">{c.course_name}</div>
                </div>
                <div className="flex gap-1">
                  {isAdmin && (
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 shadow-sm transition-all active:scale-90">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setSelected(c); setSubjectOpen(true); }} className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-sm transition-all active:scale-90">
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setSelected(c); setBatchOpen(true); }} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm transition-all active:scale-90">
                    <Layers className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button onClick={() => doDelete(c)} className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100 shadow-sm transition-all active:scale-90">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Fees (Full/Inst)</div>
                  <div className="font-semibold text-slate-700">
                    {formatAmount(c.fee_full_payment)} / {formatAmount(c.fee_installment)}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Academic Year</div>
                  <div className="font-semibold text-slate-700 truncate">
                    {yearNameById.get(c.academic_year_id) || `#${c.academic_year_id}`}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Instructor</div>
                  <div className="font-semibold text-slate-700 truncate">
                    {c.instructor_id || "-"}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              {busy ? "Loading…" : "No courses found."}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && (
          <Pagination
            currentPage={page}
            totalPages={pagination.total_pages}
            totalCount={pagination.total_count}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      <Modal title="Create Course" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course name</label>
            <input value={cName} onChange={(e) => setCName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Web Development" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Academic year</label>
            <select value={cYearId} onChange={(e) => setCYearId(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Select…</option>
              {years.map((y) => (
                <option key={y.academic_year_id} value={y.academic_year_id}>
                  {y.academic_year_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Instructor code (optional)</label>
            <input value={cInstructor} onChange={(e) => setCInstructor(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="TEA0001" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fee (Full Payment)</label>
            <input type="number" value={cFeeFull} onChange={(e) => setCFeeFull(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fee (Installment)</label>
            <input type="number" value={cFeeInst} onChange={(e) => setCFeeInst(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam Fee (GBP £)</label>
            <input type="number" value={cExamFeeGbp} onChange={(e) => setCExamFeeGbp(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">FOC Items (Add-ons)</label>
            <input
              value={cFocItems}
              onChange={(e) => setCFocItems(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. Uniform, Books (comma separated)"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
            <input 
              value={cCategory} 
              onChange={(e) => setCCategory(e.target.value)} 
              list="category-list"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Select or type a category (e.g. NCC, Diploma)"
            />
            <datalist id="category-list">
               <option value="Diploma" />
               <option value="Certificate" />
               <option value="NCC" />
          
               <option value="International Qualification" />
               <option value="GED Courses" />
               <option value="ABE courses" />
            </datalist>
          </div>
          <div className="sm:col-span-2 flex items-center justify-end pt-2">
            <button onClick={submitCreate} disabled={busy || !cName.trim() || cYearId === ""} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60">
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal title={`Edit Course${selected ? ` — ${selected.course_code}` : ""}`} open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course name</label>
            <input value={eName} onChange={(e) => setEName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Academic year</label>
            <select value={eYearId} onChange={(e) => setEYearId(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
              <option value="">Select…</option>
              {years.map((y) => (
                <option key={y.academic_year_id} value={y.academic_year_id}>
                  {y.academic_year_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Instructor code (optional)</label>
            <input value={eInstructor} onChange={(e) => setEInstructor(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="TEA0001 (leave empty to clear)" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fee (Full Payment)</label>
            <input type="number" value={eFeeFull} onChange={(e) => setEFeeFull(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fee (Installment)</label>
            <input type="number" value={eFeeInst} onChange={(e) => setEFeeInst(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam Fee (GBP £)</label>
            <input type="number" value={eExamFeeGbp} onChange={(e) => setEExamFeeGbp(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">FOC Items (Add-ons)</label>
            <input
              value={eFocItems}
              onChange={(e) => setEFocItems(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. Uniform, Books (comma separated)"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
            <input 
              value={eCategory} 
              onChange={(e) => setECategory(e.target.value)} 
              list="category-edit-list"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Select or type a category (e.g. NCC, Diploma)"
            />
            <datalist id="category-edit-list">
               <option value="Diploma" />
               <option value="Certificate" />
               <option value="NCC" />
               <option value="NCC Level 4" />
               <option value="NCC Level 5" />
               <option value="International Qualification" />
               <option value="GED Courses" />
               <option value="ABE courses" />
            </datalist>
          </div>
          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={submitEdit} disabled={busy || !selected || eYearId === ""} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60">
              Save changes
            </button>
          </div>
        </div>
      </Modal>
      <Modal title={`Batches — ${selected?.course_name}`} open={batchOpen} onClose={() => setBatchOpen(false)}>
        {selected && <BatchManagement courseId={selected.course_id} />}
      </Modal>
      <Modal title={`Subjects — ${selected?.course_name}`} open={subjectOpen} onClose={() => setSubjectOpen(false)}>
        {selected && <SubjectManagement courseId={selected.course_id} courseCode={selected.course_code} courseName={selected.course_name} />}
      </Modal>

      <ConfirmModal 
        open={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={executeDelete}
        title="Delete Course"
        message={`Are you sure you want to delete course ${courseToDelete?.course_code} (${courseToDelete?.course_name})? All enrollments and batches for this course will be affected.`}
        confirmText="Delete Course"
        variant="danger"
        isLoading={deleteCourse.isPending}
      />
    </div>
  );
}

function BatchManagement({ courseId }: { courseId: number }) {
  const { data: batchRes, isLoading } = useBatches(courseId);
  const batches = batchRes?.data || [];
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();

  const [newNo, setNewNo] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [batchToDelete, setBatchToDelete] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!newNo.trim()) return;
    try {
      await createBatch.mutateAsync({
        batch_no: newNo.trim(),
        course_id: courseId,
        start_date: newStart || null,
        end_date: newEnd || null,
        room: newRoom || null,
      });
      setNewNo(""); setNewStart(""); setNewEnd(""); setNewRoom("");
      toast.success("Batch created");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create batch");
    }
  };

  const handleDelete = async (id: number) => {
    setBatchToDelete(id);
  };

  const executeDelete = async () => {
    if (!batchToDelete) return;
    try {
      await deleteBatch.mutateAsync(batchToDelete);
      toast.success("Batch deleted");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete batch");
    } finally {
      setBatchToDelete(null);
    }
  };

  if (isLoading) return <div className="py-10 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-4">
        <h4 className="text-sm font-bold text-slate-900 border-l-4 border-brand-500 pl-3">New Batch</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Batch Number</label>
            <input value={newNo} onChange={(e) => setNewNo(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" placeholder="e.g. Batch #1" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Start Date</label>
            <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">End Date</label>
            <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Room</label>
            <input value={newRoom} onChange={(e) => setNewRoom(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm" placeholder="Room 101" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={createBatch.isPending || !newNo} className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold text-sm hover:bg-brand-700 disabled:opacity-50 transition-all active:scale-95">
          Add Batch
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-900 px-1">Active Batches</h4>
        {batches.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">No batches yet.</div>
        ) : (
          <div className="space-y-2">
            {batches.map((b) => (
              <div key={b.batch_id} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-brand-200 transition-colors group">
                <div>
                  <div className="font-bold text-slate-900">{b.batch_no}</div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {b.start_date || "?"} to {b.end_date || "?"} • {b.room || "No room"}
                  </div>
                </div>
                <button onClick={() => handleDelete(b.batch_id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SubjectManagement({ courseId, courseCode, courseName }: { courseId: number; courseCode: string; courseName: string }) {
  const { data: subjectRes, isLoading } = useSubjects(courseId);
  const subjects = subjectRes?.data || [];
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [subjectToDelete, setSubjectToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (courseCode && !isLoading) {
      if (subjects.length > 0) {
        let maxNum = 0;
        const prefix = `${courseCode}-`;
        
        subjects.forEach(s => {
          if (s.subject_code.startsWith(prefix)) {
            const numPart = s.subject_code.slice(prefix.length);
            const num = parseInt(numPart);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });

        if (maxNum > 0) {
          setNewCode(`${courseCode}-${maxNum + 1}`);
        } else {
          // If subjects exist but none match prefix, just provide prefix
          setNewCode(`${courseCode}-101`);
        }
      } else {
        setNewCode(`${courseCode}-101`);
      }
    }
  }, [courseCode, subjects, isLoading]);

  const handleCreate = async () => {
    if (!newCode.trim() || !newName.trim()) return;
    try {
      await createSubject.mutateAsync({
        subject_code: newCode.trim(),
        subject_name: newName.trim(),
        course_id: courseId,
      });
      setNewCode(""); setNewName("");
      toast.success("Subject added");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to add subject");
    }
  };

  const handleDelete = async (id: number) => {
    setSubjectToDelete(id);
  };

  const executeDelete = async () => {
    if (!subjectToDelete) return;
    try {
      await deleteSubject.mutateAsync(subjectToDelete);
      toast.success("Subject deleted");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete subject");
    } finally {
      setSubjectToDelete(null);
    }
  };

  if (isLoading) return <div className="py-10 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-4">
        <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 border-l-4 border-blue-500 pl-3">New Subject</h4>
            <div className="text-[10px] font-bold text-slate-400 uppercase bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                Course ID: {courseId}
            </div>
        </div>
        <div className="text-xs font-semibold text-slate-500 px-3">
            Adding subject for <span className="text-blue-600">{courseName}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Subject Code</label>
            <input value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" placeholder="e.g. NCC-101" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Subject Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm" placeholder="e.g. Database Systems" />
          </div>
        </div>
        <button onClick={handleCreate} disabled={createSubject.isPending || !newCode || !newName} className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
          Add Subject
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-900 px-1">Course Subjects</h4>
        {subjects.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">No subjects yet.</div>
        ) : (
          <div className="space-y-2">
            {subjects.map((s) => (
              <div key={s.subject_id} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-200 transition-colors group">
                <div>
                  <div className="font-bold text-slate-900">{s.subject_name}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{s.subject_code}</div>
                </div>
                <button onClick={() => handleDelete(s.subject_id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

