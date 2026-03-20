"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, Clock } from "lucide-react";

export default function ActivityLogsPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/dashboard");
  }, [loading, isAdmin, router]);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await AdminService.getActivityLogs();
      setLogs(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || "Failed to load activity logs.");
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activity Logs</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Track user activity like student registration, payments recording, etc.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {error && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {error}
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {logs.map((log) => (
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
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading logs..." : "No activity logs found."}
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
