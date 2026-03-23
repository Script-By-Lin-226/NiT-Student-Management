"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, Clock, Search, Download, Trash2 } from "lucide-react";
import { exportToExcel } from "@/utils/excelExport";


import { useActivityLogs, useDeleteActivityLog, useClearActivityLogs } from "@/hooks/useAdmin";

interface LogEntry {
  log_id: number;
  user_id: number;
  username: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  
  const [page, setPage] = useState(1);
  const limit = 50;
  
  const { data: logResponse, isLoading: logsLoading, error: queryError, refetch } = useActivityLogs(page, limit);
  const logs = logResponse?.data || [];
  const pagination = logResponse?.pagination;
  
  const deleteMutation = useDeleteActivityLog();
  const clearMutation = useClearActivityLogs();
  
  const [q, setQ] = useState("");
  const [dateQ, setDateQ] = useState("");

  const busy = logsLoading || deleteMutation.isPending || clearMutation.isPending;
  const error = (queryError as any)?.response?.data?.message || (queryError as any)?.message || "";

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/dashboard");
  }, [authLoading, isAdmin, router]);

  const handleDelete = async (logId: number) => {
    if (!confirm("Are you sure you want to delete this log entry?")) return;
    try {
      await deleteMutation.mutateAsync(logId);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to delete log.");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to CLEAR ALL activity logs? This cannot be undone.")) return;
    try {
      await clearMutation.mutateAsync();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to clear logs.");
    }
  };

  const filteredLogs = (logs as LogEntry[]).filter((log: LogEntry) => {
    const term = q.toLowerCase();
    const dateTerm = dateQ; // YYYY-MM-DD
    
    // Search user and action
    const matchesSearch = 
      log.username.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.details?.toLowerCase().includes(term) ||
      log.role.toLowerCase().includes(term);

    // Search date
    const logDate = new Date(log.timestamp);
    const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
    const matchesDate = !dateTerm || logDateStr === dateTerm;

    return matchesSearch && matchesDate;
  });

  if (authLoading) return null;
  if (!isAdmin) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Logs</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Track user activity like student registration, payments recording, etc.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-60 text-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={busy || logs.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-red-100 text-red-600 font-bold hover:bg-red-50 disabled:opacity-60 text-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden xs:inline">Clear All</span>
          </button>
          <button
            onClick={() => {
              const dataToExport = filteredLogs.map((log: LogEntry) => ({
                "Time": new Date(log.timestamp).toLocaleString(),
                "User": log.username,
                "Role": log.role,
                "Action": log.action,
                "Details": log.details
              }));
              exportToExcel(dataToExport, "Activity_Logs", "Logs");
            }}
            disabled={busy || filteredLogs.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-all active:scale-95 text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Search user, action or details..." 
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium text-sm sm:text-base" 
            />
          </div>
          <div className="w-full sm:w-48">
            <input 
              type="date"
              value={dateQ}
              onChange={(e) => setDateQ(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium text-sm sm:text-base"
            />
          </div>
          {error && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl animate-in shake duration-300">
              {error}
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLogs.map((log: LogEntry) => (
                <tr key={log.log_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-slate-500">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short"
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{log.username}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {log.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-brand-600">{log.action}</td>
                  <td className="px-6 py-4 text-slate-700">{log.details}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(log.log_id)}
                      disabled={busy}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-90 disabled:opacity-50"
                      title="Delete log entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading logs..." : "No matching activity logs found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredLogs.map((log: LogEntry) => (
            <div key={log.log_id} className="p-4 bg-white hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.username}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      {log.role}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(log.log_id)}
                  disabled={busy}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 transition-all active:scale-90 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-brand-600 uppercase tracking-tight">
                  {log.action}
                </div>
                {log.details && (
                  <div className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {log.details}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              {busy ? "Loading logs..." : "No matching activity logs found."}
            </div>
          )}
        </div>


        {pagination && pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">
              Showing page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{pagination.total_pages}</span> ({pagination.total_count} total logs)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || busy}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                disabled={page === pagination.total_pages || busy}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
