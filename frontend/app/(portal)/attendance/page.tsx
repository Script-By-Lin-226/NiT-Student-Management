"use client";

import { useEffect, useState } from "react";
import { PortalService, StudentAttendance } from "@/services/portal.service";
import { Clock, CheckSquare, XSquare } from "lucide-react";
import clsx from "clsx";

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<StudentAttendance | null>(null);

  useEffect(() => {
    PortalService.getStudentAttendance().then(setAttendance).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
        <p className="text-slate-500 font-medium text-sm mt-1 mb-6">Track your daily class attendance.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-3 border-b border-slate-100 divide-x divide-slate-100 text-center bg-slate-50/50">
          <div className="p-6">
            <p className="text-sm font-semibold text-slate-500 mb-1">Total Days</p>
            <p className="text-2xl font-bold text-slate-800">{attendance?.summary?.total || 0}</p>
          </div>
          <div className="p-6">
            <p className="text-sm font-semibold text-slate-500 mb-1">Present</p>
            <p className="text-2xl font-bold text-emerald-600">{attendance?.summary?.present || 0}</p>
          </div>
          <div className="p-6">
            <p className="text-sm font-semibold text-slate-500 mb-1">Attendance Rate</p>
            <p className="text-2xl font-bold text-brand-600">{attendance?.summary?.attendance_rate || 0}%</p>
          </div>
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white text-xs uppercase font-semibold text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attendance?.records.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-700 flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {r.date}
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                        r.status === "Present" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-red-50 text-red-600 border-red-100"
                      )}
                    >
                      {r.status === "Present" ? <CheckSquare className="w-3.5 h-3.5" /> : <XSquare className="w-3.5 h-3.5" />}
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!attendance || attendance.records.length === 0) && (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-slate-400 font-medium">
                    No attendance records found.
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
