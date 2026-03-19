"use client";

import { useEffect, useState } from "react";
import { PortalService, TimetableSlot } from "@/services/portal.service";
import { CalendarDays, Clock, MapPin } from "lucide-react";

export default function TimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);

  useEffect(() => {
    PortalService.getStudentTimetable().then(setSlots).catch(console.error);
  }, []);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Timetable</h1>
        <p className="text-slate-500 font-medium text-sm mt-1 mb-6">Your weekly course schedule.</p>
      </div>

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
                   <div key={i} className="px-6 py-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
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
                     <div className="hidden sm:flex text-sm font-semibold text-slate-500 items-center">
                       <MapPin className="w-4 h-4 mr-1 text-slate-400" /> Room 101
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          );
        })}

        {slots.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
             <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
             <h3 className="text-sm font-bold text-slate-700">No scheduled classes</h3>
             <p className="text-xs text-slate-500 mt-1">There are no classes scheduled for your enrolled courses.</p>
          </div>
        )}
      </div>
    </div>
  );
}
