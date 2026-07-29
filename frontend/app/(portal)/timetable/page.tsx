"use client";

import { useCallback, useEffect, useState } from "react";
import { PortalService, TimetableSlot } from "@/services/portal.service";
import { CalendarDays, Clock, MapPin, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

export default function TimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PortalService.getStudentTimetable();
      setSlots(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load timetable. Please check your connection and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Timetable</h1>
        <p className="text-slate-500 font-medium text-sm mt-1 mb-6">Your weekly course schedule.</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Could not load timetable</p>
            <p className="text-xs text-red-500 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchTimetable}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading your timetable…</p>
        </div>
      )}

      {/* Timetable Content */}
      {!loading && !error && (
        <div className="space-y-4">
          {days.map(day => {
            const daySlots = slots.filter(s => s.day === day);
            if (daySlots.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-brand-500" />
                    {day}
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {daySlots.map((slot, i) => (
                    <div key={i} className="px-6 py-5 flex items-start gap-4 hover:bg-blue-50 hover:shadow-md transition-colors">
                      <div className="min-w-[120px]">
                        <span className="inline-flex flex-col gap-1 items-start text-sm font-bold text-slate-800">
                          <span className="flex items-center text-slate-500 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 mr-1" /> Time
                          </span>
                          {slot.start_time} - {slot.end_time}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-base">{slot.course.course_name}</h4>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">{slot.course.course_code}</p>
                      </div>
                      {slot.room_name && (
                        <div className="hidden sm:flex text-sm font-semibold text-slate-500 items-center">
                          <MapPin className="w-4 h-4 mr-1 text-slate-400" /> {slot.room_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {slots.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No scheduled classes</h3>
              <p className="text-xs text-slate-500 mt-1">There are no classes scheduled for your enrolled courses.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
