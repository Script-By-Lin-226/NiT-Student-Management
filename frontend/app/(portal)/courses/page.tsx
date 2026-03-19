"use client";

import { useEffect, useState } from "react";
import { PortalService, StudentCourse } from "@/services/portal.service";
import { BookOpen, Calendar, Clock, ArrowRight } from "lucide-react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<StudentCourse[]>([]);

  useEffect(() => {
    PortalService.getStudentCourses().then(setCourses).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Courses</h1>
        <p className="text-slate-500 font-medium text-sm mt-1 mb-6">Explore the courses you are currently enrolled in.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map((c, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl ring-4 ring-white shadow-sm">
                {c.course.course_name[0]}
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                Active
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
              {c.course.course_name}
            </h3>
            <p className="text-sm font-medium text-slate-500 mb-6">{c.course.course_code}</p>

            <div className="mt-auto space-y-3">
              <div className="flex items-center text-sm font-medium text-slate-600">
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                Joined {c.enrollment_date.split(" ")[0]}
              </div>
              <div className="flex items-center text-sm font-medium text-slate-600">
                <Clock className="w-4 h-4 mr-2 text-slate-400" />
                Status: {c.status}
              </div>
              <div className="flex items-center text-sm font-medium text-slate-600">
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                Start: {c.course.start_date || "TBA"}
              </div>
              <div className="flex items-center text-sm font-medium text-slate-600">
                <BookOpen className="w-4 h-4 mr-2 text-slate-400" />
                Room: {c.course.room || "TBA"}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">View progress</span>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {courses.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No courses found</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">You have not been assigned to any courses yet.</p>
        </div>
      )}
    </div>
  );
}
