"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AdminCourse, AdminRoom, AdminService, AdminTimeTableRow } from "@/services/admin.service";
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
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export default function AdminTimetablesPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  const [rows, setRows] = useState<AdminTimeTableRow[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminTimeTableRow | null>(null);

  const [cCourseCode, setCCourseCode] = useState("");
  const [cDay, setCDay] = useState<(typeof DAYS)[number]>("Monday");
  const [cSlots, setCSlots] = useState<{ start: string; end: string }[]>([{ start: "09:00", end: "10:00" }]);
  const [cRoom, setCRoom] = useState<string>("");

  const [eDay, setEDay] = useState<(typeof DAYS)[number]>("Monday");
  const [eStart, setEStart] = useState("09:00");
  const [eEnd, setEEnd] = useState("10:00");
  const [eRoom, setERoom] = useState<string>("");

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [loading, isAdmin, router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      return (
        r.course_code.toLowerCase().includes(term) ||
        r.course_name.toLowerCase().includes(term) ||
        r.day_of_week.toLowerCase().includes(term) ||
        (r.room_name || "").toLowerCase().includes(term)
      );
    });
  }, [q, rows]);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const [tt, cs, rs] = await Promise.all([AdminService.listTimetables(), AdminService.listCourses(), AdminService.listRooms()]);
      setRows(tt);
      setCourses(cs);
      setRooms(rs);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to load timetable");
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
    setCCourseCode(courses[0]?.course_code ?? "");
    setCDay("Monday");
    setCSlots([{ start: "09:00", end: "10:00" }]);
    setCRoom(rooms[0]?.room_name ?? "");
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setBusy(true);
    setError("");
    try {
      await Promise.all(
        cSlots.map(slot =>
          AdminService.createTimetable({
            course_code: cCourseCode,
            day_of_week: cDay,
            start_time: slot.start,
            end_time: slot.end,
            room_name: cRoom || null,
          })
        )
      );
      setCreateOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to create timetable");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (r: AdminTimeTableRow) => {
    setSelected(r);
    setEDay(r.day_of_week as any);
    setEStart(r.start_time);
    setEEnd(r.end_time);
    setERoom(r.room_name || "");
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.updateTimetable(selected.timetable_id, {
        day_of_week: eDay,
        start_time: eStart,
        end_time: eEnd,
        room_name: eRoom || null,
      });
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to update timetable");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (r: AdminTimeTableRow) => {
    const ok = window.confirm(`Delete timetable for ${r.course_code} on ${r.day_of_week} ${r.start_time}-${r.end_time}?`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.deleteTimetable(r.timetable_id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to delete timetable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Timetable</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Create weekly classes per course with times and room.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm">
            <Plus className="w-4 h-4" />
            New Slot
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search course/day/room…" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium" />
          </div>
          {error && <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Day</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Room</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((r) => (
                <tr key={r.timetable_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{r.course_name}</div>
                    <div className="text-xs text-slate-500 font-medium">{r.course_code}</div>
                  </td>
                  <td className="px-6 py-4">{r.day_of_week}</td>
                  <td className="px-6 py-4 font-semibold">{r.start_time} - {r.end_time}</td>
                  <td className="px-6 py-4">{r.room_name || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(r)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50">
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button onClick={() => doDelete(r)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-50">
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
                    {busy ? "Loading…" : "No timetable slots found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title="Create Timetable Slot" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course</label>
            <select value={cCourseCode} onChange={(e) => setCCourseCode(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              {courses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_name} ({c.course_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Day</label>
            <select value={cDay} onChange={(e) => setCDay(e.target.value as any)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Room</label>
            <select value={cRoom} onChange={(e) => setCRoom(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <option value="">(no room)</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_name}>
                  {r.room_name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-3">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time Slots</label>
            {cSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-3">
                <input 
                  value={slot.start} 
                  onChange={(e) => setCSlots(cSlots.map((s, idx) => idx === i ? { ...s, start: e.target.value } : s))} 
                  type="time" 
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" 
                />
                <span className="text-slate-400 font-bold">to</span>
                <input 
                  value={slot.end} 
                  onChange={(e) => setCSlots(cSlots.map((s, idx) => idx === i ? { ...s, end: e.target.value } : s))} 
                  type="time" 
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" 
                />
                {cSlots.length > 1 && (
                  <button type="button" onClick={() => setCSlots(cSlots.filter((_, idx) => idx !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                     <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setCSlots([...cSlots, { start: "09:00", end: "10:00" }])} className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">
               + Add another time slot
            </button>
          </div>
          <div className="sm:col-span-2 flex items-center justify-end pt-2">
            <button onClick={submitCreate} disabled={busy || !cCourseCode || cSlots.some(s => !s.start || !s.end)} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60">
              Create
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Edit Timetable Slot" open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 text-sm font-semibold text-slate-700">
            {selected ? `${selected.course_name} (${selected.course_code})` : ""}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Day</label>
            <select value={eDay} onChange={(e) => setEDay(e.target.value as any)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Room</label>
            <select value={eRoom} onChange={(e) => setERoom(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <option value="">(no room)</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_name}>
                  {r.room_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start</label>
            <input value={eStart} onChange={(e) => setEStart(e.target.value)} type="time" className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End</label>
            <input value={eEnd} onChange={(e) => setEEnd(e.target.value)} type="time" className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" />
          </div>
          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setEditOpen(false)} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={submitEdit} disabled={busy || !selected} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60">
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

