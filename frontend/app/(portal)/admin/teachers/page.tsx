"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminService } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { Users, Search, RefreshCw, X, AlertCircle, Pencil, Trash2, Key, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTeachers, useDeleteUser } from "@/hooks/useAdmin";
import { Pagination } from "@/components/ui/Pagination";
import ConfirmModal from "@/components/ConfirmModal";

export default function AdminTeachersPage() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
  const { data: teachersResponse, isLoading: loading, refetch: refresh, error: fetchError } = useTeachers(page, limit);
  const rawTeachers = teachersResponse?.data || [];
  const pagination = teachersResponse?.pagination;

  const [q, setQ] = useState("");
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const deleteMutation = useDeleteUser();

  const displayedTeachers = useMemo(() => {
    if (!q) return rawTeachers;
    const s = q.toLowerCase();
    return rawTeachers.filter(t => 
      t.username.toLowerCase().includes(s) || 
      t.user_code.toLowerCase().includes(s) ||
      t.email.toLowerCase().includes(s)
    );
  }, [rawTeachers, q]);

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin, page, refresh]);

  const handleDelete = (t: any) => setUserToDelete(t);
  
  const executeDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteMutation.mutateAsync(userToDelete.user_code);
      toast.success("Teacher deleted successfully");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e.message || "Failed to delete teacher");
    } finally {
      setUserToDelete(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teachers</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Manage instructor accounts and course assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all active:scale-95 shadow-sm sm:w-auto w-full justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {(fetchError || deleteMutation.error) && (
        <div className="px-5 py-4 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <div className="flex-1">
            <span className="font-extrabold mr-2 uppercase tracking-tighter">Error:</span>
            {(fetchError as any)?.message || (deleteMutation.error as any)?.message || "An error occurred."}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search teachers..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedTeachers.map((t) => (
                <tr key={t.user_code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{t.user_code}</td>
                  <td className="px-6 py-4 font-medium">{t.username}</td>
                  <td className="px-6 py-4">{t.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.is_active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => handleDelete(t)}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                      title="Delete Teacher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {displayedTeachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {loading ? "Loading..." : "No teachers found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      <ConfirmModal 
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={executeDelete}
        title="Delete Teacher"
        message={`Are you sure you want to delete teacher ${userToDelete?.username} (${userToDelete?.user_code})? This action cannot be undone.`}
        confirmText="Delete Teacher"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
