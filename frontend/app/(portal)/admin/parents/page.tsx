"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminParent, AdminService } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { Users, Link2, UserPlus } from "lucide-react";

export default function AdminParentsPage() {
  const { isAdmin } = useAuth();
  const [parents, setParents] = useState<AdminParent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    date_of_birth: "",
    is_active: true,
  });

  const [linkForm, setLinkForm] = useState({
    parent_code: "",
    student_code: "",
    relationship_label: "parent",
  });

  const canCreate = useMemo(() => {
    return createForm.username.trim() && createForm.email.trim() && createForm.password.trim() && createForm.date_of_birth.trim();
  }, [createForm]);

  const canLink = useMemo(() => {
    return linkForm.parent_code.trim() && linkForm.student_code.trim();
  }, [linkForm]);

  async function refresh() {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await AdminService.listParents();
      setParents(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load parents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      await AdminService.createParent({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        date_of_birth: createForm.date_of_birth,
        is_active: createForm.is_active,
      });
      setCreateForm({ username: "", email: "", password: "", date_of_birth: "", is_active: true });
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create parent");
    } finally {
      setLoading(false);
    }
  }

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    if (!canLink) return;
    setLoading(true);
    setError(null);
    try {
      await AdminService.linkParentChild(linkForm.parent_code.trim(), {
        student_code: linkForm.student_code.trim(),
        relationship_label: linkForm.relationship_label.trim() || "parent",
      });
      setLinkForm({ parent_code: "", student_code: "", relationship_label: "parent" });
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to link parent to child");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parents</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Create parent accounts and link them to students</p>
        </div>
      </div>

      {error && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100">
          <div className="text-sm font-semibold text-rose-700">Error</div>
          <div className="text-sm text-rose-600 mt-1">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={onCreate} className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-900">Create parent account</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Username
              <input
                value={createForm.username}
                onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Parent name"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Email
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="parent@email.com"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Password
              <input
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                type="password"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="••••••••"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Date of birth
              <input
                value={createForm.date_of_birth}
                onChange={(e) => setCreateForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                type="date"
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              checked={createForm.is_active}
              onChange={(e) => setCreateForm((p) => ({ ...p, is_active: e.target.checked }))}
              type="checkbox"
              className="h-4 w-4"
            />
            Active account
          </label>

          <button
            type="submit"
            disabled={!canCreate || loading}
            className="mt-5 w-full rounded-xl bg-brand-600 text-white font-semibold px-4 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-brand-700 transition"
          >
            {loading ? "Working..." : "Create parent"}
          </button>
        </form>

        <form onSubmit={onLink} className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Link2 className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-slate-900">Link parent to student</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Parent code
              <input
                value={linkForm.parent_code}
                onChange={(e) => setLinkForm((p) => ({ ...p, parent_code: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="PAR0001"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Student code
              <input
                value={linkForm.student_code}
                onChange={(e) => setLinkForm((p) => ({ ...p, student_code: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="STU0001"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Relationship label
              <input
                value={linkForm.relationship_label}
                onChange={(e) => setLinkForm((p) => ({ ...p, relationship_label: e.target.value }))}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="mother / father / guardian"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={!canLink || loading}
            className="mt-5 w-full rounded-xl bg-slate-900 text-white font-semibold px-4 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-800 transition"
          >
            {loading ? "Working..." : "Link parent → student"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-lg">All parents</h3>
          </div>
          <button
            onClick={() => refresh().catch(console.error)}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {parents.map((p) => (
                <tr key={p.user_code} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{p.user_code}</td>
                  <td className="px-6 py-4">{p.username}</td>
                  <td className="px-6 py-4">{p.email}</td>
                  <td className="px-6 py-4">{p.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
              {parents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">
                    {loading ? "Loading..." : "No parents found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

