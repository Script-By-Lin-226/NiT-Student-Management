"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  PortalService,
  TeacherClassInfo,
} from "@/services/portal.service";
import {
  BookOpen,
  Clock,
  Users,
  MapPin,
  Calendar,
  Search,
  Filter,
  GraduationCap,
  ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<TeacherClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState<string>("all");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const data = await PortalService.getTeacherAssignments();
        setClasses(data);
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load class information");
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Get unique days for filter
  const uniqueDays = Array.from(
    new Set(classes.map((c) => c.day_of_week).filter(Boolean))
  ) as string[];

  // Filter and search
  const filtered = classes.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.subject_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.batch_no || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDay =
      filterDay === "all" || c.day_of_week === filterDay || (!c.day_of_week && filterDay === "unscheduled");

    return matchesSearch && matchesDay;
  });

  // Group by course for a structured view
  const groupedByCourse = filtered.reduce((acc, cls) => {
    const key = cls.course_id;
    if (!acc[key]) {
      acc[key] = {
        course_id: cls.course_id,
        course_code: cls.course_code,
        course_name: cls.course_name,
        entries: [],
      };
    }
    acc[key].entries.push(cls);
    return acc;
  }, {} as Record<number, { course_id: number; course_code: string; course_name: string; entries: TeacherClassInfo[] }>);

  const courseGroups = Object.values(groupedByCourse);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Classes
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            All courses and schedules assigned to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-brand-50 text-brand-600 border border-brand-100/60 px-3.5 py-2 rounded-xl text-sm font-bold">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100">
          <div className="text-sm font-semibold text-rose-700">Error loading classes</div>
          <div className="text-sm text-rose-600 mt-1">{error}</div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by course, subject, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-300 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-300 outline-none appearance-none cursor-pointer transition-all min-w-[160px]"
          >
            <option value="all">All Days</option>
            <option value="unscheduled">Unscheduled</option>
            {uniqueDays.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-6">
              <div className="flex items-center gap-4 mb-5">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && courseGroups.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">No classes found</h3>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery || filterDay !== "all"
              ? "Try adjusting your search or filter"
              : "No classes have been assigned to you yet"}
          </p>
        </div>
      )}

      {/* Class Cards - Grouped by Course */}
      {!loading &&
        courseGroups.map((group) => {
          // Calculate aggregate stats for this course
          const totalStudents = Math.max(
            ...group.entries.map((e) => e.total_students),
            0
          );
          const scheduledEntries = group.entries.filter(
            (e) => e.start_time && e.end_time
          );
          const uniqueSubjects = Array.from(
            new Set(
              group.entries
                .map((e) => e.subject_name)
                .filter(Boolean)
            )
          );
          const uniqueBatches = Array.from(
            new Set(
              group.entries
                .map((e) => e.batch_no)
                .filter(Boolean)
            )
          );

          return (
            <div
              key={group.course_id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden hover:shadow-md transition-shadow duration-300"
            >
              {/* Course Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center text-brand-600 font-black text-lg shadow-inner border border-brand-100/60">
                      {group.course_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">
                        {group.course_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md uppercase tracking-wider border border-brand-100/60">
                          {group.course_code}
                        </span>
                        {uniqueBatches.length > 0 && (
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {uniqueBatches.length} {uniqueBatches.length === 1 ? "Batch" : "Batches"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <Users className="w-4 h-4 text-slate-400" />
                      {totalStudents} students
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <GraduationCap className="w-4 h-4 text-slate-400" />
                      {uniqueSubjects.length} {uniqueSubjects.length === 1 ? "subject" : "subjects"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Entries */}
              <div className="p-4">
                {scheduledEntries.length === 0 && group.entries.length > 0 ? (
                  // No schedule but has entries - show subject/batch info
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.entries.map((entry, idx) => (
                      <div
                        key={`${entry.course_id}-${entry.batch_id}-${entry.subject_id}-${idx}`}
                        className="bg-slate-50/50 rounded-xl p-4 border border-slate-100/80 hover:bg-white hover:shadow-sm hover:border-brand-100 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                              Not Scheduled
                            </span>
                          </div>
                        </div>

                        {entry.subject_name && (
                          <p className="text-sm font-bold text-slate-800 mb-2">
                            {entry.subject_name}
                          </p>
                        )}

                        <div className="space-y-1.5">
                          {entry.batch_no && (
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-slate-400" />
                              {entry.batch_no}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            {entry.total_students} students
                          </p>
                          {entry.room && (
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {entry.room}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Scheduled entries
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.entries.map((entry, idx) => (
                      <div
                        key={`${entry.timetable_id || idx}-${entry.batch_id}-${entry.subject_id}`}
                        className="bg-slate-50/50 rounded-xl p-4 border border-slate-100/80 hover:bg-white hover:shadow-sm hover:border-brand-100 transition-all duration-200"
                      >
                        {/* Day & Time Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${entry.day_of_week ? "bg-emerald-400" : "bg-amber-400"}`} />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                              {entry.day_of_week || "Not Scheduled"}
                            </span>
                          </div>
                          {entry.start_time && entry.end_time && (
                            <span className="text-[10px] font-black bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md border border-brand-100/60">
                              {entry.start_time} – {entry.end_time}
                            </span>
                          )}
                        </div>

                        {/* Subject */}
                        {entry.subject_name && (
                          <p className="text-sm font-bold text-slate-800 mb-2">
                            {entry.subject_name}
                          </p>
                        )}

                        {/* Details */}
                        <div className="space-y-1.5">
                          {entry.batch_no && (
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-slate-400" />
                              {entry.batch_no}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            {entry.total_students} students
                          </p>
                          {entry.room && (
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {entry.room}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject Tags Footer */}
              {uniqueSubjects.length > 0 && (
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Subjects:
                  </span>
                  {uniqueSubjects.map((subj) => (
                    <span
                      key={subj}
                      className="text-xs font-bold bg-brand-600 text-white px-2.5 py-1 rounded-lg shadow-sm"
                    >
                      {subj}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
