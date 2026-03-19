"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminAcademicYear, AdminCourse, AdminService } from "@/services/admin.service";
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

export default function AdminCoursesPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  const [years, setYears] = useState<AdminAcademicYear[]>([]);
  const [rows, setRows] = useState<AdminCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminCourse | null>(null);

  const [cName, setCName] = useState("");
  const [cYearId, setCYearId] = useState<number | "">("");
  const [cInstructor, setCInstructor] = useState("");
  const [cStartDate, setCStartDate] = useState("");
  const [cEndDate, setCEndDate] = useState("");
  const [cRoom, setCRoom] = useState("");
  const [cCost, setCCost] = useState<number | "">("");
  const [cDiscount, setCDiscount] = useState("");

  const [eName, setEName] = useState("");
  const [eYearId, setEYearId] = useState<number | "">("");
  const [eInstructor, setEInstructor] = useState("");
  const [eStartDate, setEStartDate] = useState("");
  const [eEndDate, setEEndDate] = useState("");
  const [eRoom, setERoom] = useState("");
  const [eCost, setECost] = useState<number | "">("");
  const [eDiscount, setEDiscount] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [loading, isAdmin, router]);

  const yearNameById = useMemo(() => {
    const m = new Map<number, string>();
    years.forEach((y) => m.set(y.academic_year_id, y.academic_year_name));
    return m;
  }, [years]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((c) => c.course_code.toLowerCase().includes(term) || c.course_name.toLowerCase().includes(term));
  }, [q, rows]);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const [y, c] = await Promise.all([AdminService.listAcademicYears(), AdminService.listCourses()]);
      setYears(y);
      setRows(c);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to load courses");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (loading) return null;
  if (!isAdmin) return null;

  const openCreate = () => {
    setCName("");
    setCInstructor("");
    setCStartDate("");
    setCEndDate("");
    setCRoom("");
    setCCost("");
    setCDiscount("");
    setCYearId(years[0]?.academic_year_id ?? "");
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (cYearId === "") return;
    setBusy(true);
    setError("");
    try {
      await AdminService.createCourse({
        course_name: cName.trim(),
        academic_year_id: cYearId,
        instructor_user_code: cInstructor.trim() ? cInstructor.trim() : null,
        start_date: cStartDate.trim() ? cStartDate.trim() : null,
        end_date: cEndDate.trim() ? cEndDate.trim() : null,
        room: cRoom.trim() ? cRoom.trim() : null,
        cost: cCost !== "" ? Number(cCost) : null,
        discount_plan: cDiscount.trim() ? cDiscount.trim() : null,
      });
      setCreateOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to create course");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (c: AdminCourse) => {
    setSelected(c);
    setEName(c.course_name);
    setEYearId(c.academic_year_id);
    setEInstructor(""); // backend doesn't return user_code for instructor currently
    setEStartDate(c.start_date || "");
    setEEndDate(c.end_date || "");
    setERoom(c.room || "");
    setECost(c.cost ?? "");
    setEDiscount(c.discount_plan || "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected) return;
    if (eYearId === "") return;
    setBusy(true);
    setError("");
    try {
      await AdminService.updateCourse(selected.course_code, {
        course_name: eName.trim(),
        academic_year_id: eYearId,
        instructor_user_code: eInstructor.trim() ? eInstructor.trim() : null,
        start_date: eStartDate.trim() ? eStartDate.trim() : null,
        end_date: eEndDate.trim() ? eEndDate.trim() : null,
        room: eRoom.trim() ? eRoom.trim() : null,
        cost: eCost !== "" ? Number(eCost) : null,
        discount_plan: eDiscount.trim() ? eDiscount.trim() : null,
      });
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to update course");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (c: AdminCourse) => {
    const ok = window.confirm(`Delete course ${c.course_code} (${c.course_name})?`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.deleteCourse(c.course_code);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to delete course");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Courses</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Create, update, and delete courses.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm">
            <Plus className="w-4 h-4" />
            New Course
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code or name…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium" />
          </div>
          {error && <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Cost (MMK)</th>
                <th className="px-6 py-4">Academic Year</th>
                <th className="px-6 py-4">Instructor ID</th>
                <th className="px-6 py-4">Start Date</th>
                <th className="px-6 py-4">End Date</th>
                <th className="px-6 py-4">Room</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((c) => (
                <tr key={c.course_code} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{c.course_code}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{c.course_name}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{c.cost ? c.cost.toLocaleString() : "-"}</td>
                  <td className="px-6 py-4">{yearNameById.get(c.academic_year_id) || `#${c.academic_year_id}`}</td>
                  <td className="px-6 py-4">{c.instructor_id ?? "-"}</td>
                  <td className="px-6 py-4">{c.start_date ?? "-"}</td>
                  <td className="px-6 py-4">{c.end_date ?? "-"}</td>
                  <td className="px-6 py-4">{c.room ?? "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50">
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button onClick={() => doDelete(c)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No courses found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
            <input type="date" value={cStartDate} onChange={(e) => setCStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
            <input type="date" value={cEndDate} onChange={(e) => setCEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Room</label>
            <input type="text" value={cRoom} onChange={(e) => setCRoom(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. room 6" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cost (MMK)</label>
            <input type="number" value={cCost} onChange={(e) => setCCost(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="5000000" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Discount Plan (Optional)</label>
            <input type="text" value={cDiscount} onChange={(e) => setCDiscount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. Early Bird 10%" />
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
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
            <input type="date" value={eStartDate} onChange={(e) => setEStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
            <input type="date" value={eEndDate} onChange={(e) => setEEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Room</label>
            <input type="text" value={eRoom} onChange={(e) => setERoom(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. room 6" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cost (MMK)</label>
            <input type="number" value={eCost} onChange={(e) => setECost(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="5000000" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Discount Plan (Optional)</label>
            <input type="text" value={eDiscount} onChange={(e) => setEDiscount(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="e.g. Early Bird 10%" />
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
    </div>
  );
}

