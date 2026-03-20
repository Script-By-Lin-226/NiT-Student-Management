"use client";

import { useEffect, useState, useMemo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminService, AdminUser } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, RefreshCw, X } from "lucide-react";

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
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminStaffPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  
  const [createOpen, setCreateOpen] = useState(false);
  
  const [cUsername, setCUsername] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cDob, setCDob] = useState("");
  const [cRole, setCRole] = useState("sales");
  const [cActive, setCActive] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [loading, isAdmin, router]);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await AdminService.listAllUsers();
      // Filter out students and parents to focus on staff/sales/admin
      setRows(data.filter((u) => u.role !== "student" && u.role !== "parent" && u.role !== "admin"));
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Failed to load staff.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.user_code.toLowerCase().includes(term) || r.username.toLowerCase().includes(term));
  }, [q, rows]);

  const openCreate = () => {
    setCUsername("");
    setCEmail("");
    setCPassword("");
    setCDob("");
    setCRole("sales");
    setCActive(true);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setBusy(true);
    setError("");
    try {
      await AdminService.createStaff({
        username: cUsername,
        email: cEmail,
        password: cPassword,
        date_of_birth: cDob,
        role: cRole,
        is_active: cActive,
      });
      setCreateOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Failed to create staff.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff & Roles</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Manage Sales, HR, and other Staff accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Staff
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search staff members..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {error && <div className="text-sm font-semibold text-red-600">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.user_code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{r.user_code}</td>
                  <td className="px-6 py-4 font-medium">{r.username}</td>
                  <td className="px-6 py-4">{r.email}</td>
                  <td className="px-6 py-4 capitalize font-semibold">{r.role}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${r.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading..." : "No staff found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title="Create Staff Account" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input value={cUsername} onChange={e => setCUsername(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input type="password" value={cPassword} onChange={e => setCPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth</label>
            <input type="date" value={cDob} onChange={e => setCDob(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
            <select value={cRole} onChange={e => setCRole(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <option value="sales">Sales</option>
              <option value="teacher">Teacher</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={submitCreate} disabled={busy} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700">
              {busy ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
