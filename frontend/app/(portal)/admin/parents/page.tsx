"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminService } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { Users, Link2, UserPlus, AlertCircle, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useParents, useCreateParent, useLinkParentChild } from "@/hooks/useAdmin";
import { Pagination } from "@/components/ui/Pagination";

export default function AdminParentsPage() {
  const { isAdminOrSales } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
  const { data: parentsResponse, isLoading: loading, refetch: refresh } = useParents(page, limit);
  const rawParents = parentsResponse?.data || [];
  const pagination = parentsResponse?.pagination;

  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [working, setWorking] = useState(false);

  const createParentMutation = useCreateParent();
  const linkParentMutation = useLinkParentChild();

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

  const displayedParents = useMemo(() => {
    if (!q) return rawParents;
    const s = q.toLowerCase();
    return rawParents.filter(p => 
      p.username.toLowerCase().includes(s) || 
      p.user_code.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s)
    );
  }, [rawParents, q]);

  const canCreate = useMemo(() => {
    return createForm.username.trim() && createForm.email.trim() && createForm.password.trim() && createForm.date_of_birth.trim();
  }, [createForm]);

  const canLink = useMemo(() => {
    return linkForm.parent_code.trim() && linkForm.student_code.trim();
  }, [linkForm]);

  useEffect(() => {
    if (isAdminOrSales) refresh();
  }, [isAdminOrSales, page, refresh]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setWorking(true);
    setError(null);
    try {
      await createParentMutation.mutateAsync({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        date_of_birth: createForm.date_of_birth,
        is_active: createForm.is_active,
      });
      setCreateForm({ username: "", email: "", password: "", date_of_birth: "", is_active: true });
      toast.success("Parent created successfully");
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Failed to create parent");
    } finally {
      setWorking(false);
    }
  }

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    if (!canLink) return;
    setWorking(true);
    setError(null);
    try {
      await linkParentMutation.mutateAsync({
        parentCode: linkForm.parent_code.trim(),
        payload: {
          student_code: linkForm.student_code.trim(),
          relationship_label: linkForm.relationship_label.trim() || "parent",
        }
      });
      setLinkForm({ parent_code: "", student_code: "", relationship_label: "parent" });
      toast.success("Parent linked successfully");
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Failed to link parent to child");
    } finally {
      setWorking(false);
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
        <div className="px-5 py-4 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <div className="flex-1">
            <span className="font-extrabold mr-2 uppercase tracking-tighter">System Error:</span>
            {error}
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
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
            disabled={!canCreate || working}
            className="mt-5 w-full rounded-xl bg-brand-600 text-white font-bold px-4 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-brand-700 transition-all active:scale-95 text-sm"
          >
            {working ? "Working..." : "Create parent"}
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
            disabled={!canLink || working}
            className="mt-5 w-full rounded-xl bg-slate-900 text-white font-bold px-4 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-slate-800 transition-all active:scale-95 text-sm"
          >
            {working ? "Working..." : "Link parent → student"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-900 text-lg">All parents</h3>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end min-w-[200px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none"
              />
            </div>
            <button
              onClick={() => refresh().catch(console.error)}
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all active:scale-95 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="hidden sm:block overflow-x-auto">
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
              {displayedParents.map((p) => (
                <tr key={p.user_code} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{p.user_code}</td>
                  <td className="px-6 py-4">{p.username}</td>
                  <td className="px-6 py-4">{p.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {p.is_active ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
              {displayedParents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">
                    {loading ? "Loading..." : "No parents found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {displayedParents.map((p) => (
            <div key={p.user_code} className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{p.user_code}</div>
                  <div className="font-bold text-slate-900 leading-tight">{p.username}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{p.email}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
          {displayedParents.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              {loading ? "Loading..." : "No parents found."}
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
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        )}
      </div>
    </div>
  );
}
