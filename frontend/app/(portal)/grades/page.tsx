"use client";

import { useEffect, useState } from "react";
import { PortalService, StudentGrade } from "@/services/portal.service";
import { Award, BookOpen, Star } from "lucide-react";

export default function GradesPage() {
  const [grades, setGrades] = useState<StudentGrade[]>([]);

  useEffect(() => {
    PortalService.getStudentGrades().then(setGrades).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grades</h1>
        <p className="text-slate-500 font-medium text-sm mt-1 mb-6">Your academic performance and test results.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4">Grade Point</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {grades.map((g, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                     </div>
                     <div>
                       <p>{g.course.course_name}</p>
                       <p className="text-xs text-slate-400 font-medium">{g.course.course_code}</p>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-bold bg-slate-100 text-slate-700">
                       {g.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">
                     {g.grade_point.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <Star className="w-3 h-3" /> Pass
                    </span>
                  </td>
                </tr>
              ))}
              {grades.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Award className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-700 mb-1">No grades yet</h3>
                    <p className="text-xs text-slate-500">Your exam results will appear here once published.</p>
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
