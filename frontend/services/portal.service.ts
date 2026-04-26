import { api } from "./api";
import { PaginatedResponse } from "./admin.service";

// types
export interface PortalUser {
  user_id: number;
  user_code: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface StudentCourse {
  enrollment_id: number;
  enrollment_code: string;
  enrollment_date: string;
  status: string;
  batch_no?: string | null;
  course: {
    course_id: number;
    course_code: string;
    course_name: string;
    start_date?: string | null;
    room?: string | null;
  };
}

export interface AttendanceRecord {
  attendance_id?: number;
  date: string;
  status: "Present" | "Absent";
  course_name?: string;
  slot?: string;
}

export interface ChildAttendanceData {
  records: AttendanceRecord[];
  summary: {
    total: number;
    present: number;
    rate: number;
  };
  pagination: {
    total_count: number;
    total_pages: number;
    current_page: number;
    limit: number;
  };
}

export interface StudentAttendance {
  records: AttendanceRecord[];
  summary: {
    total: number;
    present: number;
    attendance_rate: number;
  };
}

export interface StudentGrade {
  grade_id: number;
  grade: string;
  grade_point: number;
  course: {
    course_code: string;
    course_name: string;
  };
}

export interface TimetableSlot {
  timetable_id: number;
  day: string;
  start_time: string;
  end_time: string;
  course: {
    course_code: string;
    course_name: string;
  };
}

export interface Child {
  student_code: string;
  username: string;
  email: string;
  relationship: string;
}

export interface StaffAttendanceRecord {
  attendance_id: number;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  note: string | null;
}

export interface StaffAttendanceData {
  records: StaffAttendanceRecord[];
  summary: {
    total: number;
    present: number;
    rate: number;
  };
}

// --------- Teacher Types ---------
export interface TeacherClassInfo {
  timetable_id: number | null;
  teacher_name: string;
  teacher_code: string;
  course_id: number;
  course_code: string;
  course_name: string;
  subject_id: number | null;
  subject_code: string | null;
  subject_name: string | null;
  batch_id: number | null;
  batch_no: string | null;
  total_students: number;
  room: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface TeacherDailyHours {
  day_of_week: string;
  total_hours: number;
  total_minutes: number;
  total_slots: number;
}

export interface TeacherBatchStudents {
  batch_id: number;
  batch_no: string;
  total_students: number;
}

export interface TeacherBatchAttendance {
  batch_id: number;
  batch_no: string;
  total_records: number;
  present_count: number;
  attendance_rate: number;
}

export class PortalService {
  // --------- Student Routes ---------
  static async getStudentMe(): Promise<PortalUser> {
    const res = await api.get("/portal/student/me");
    return res.data.data;
  }

  static async getStudentCourses(): Promise<StudentCourse[]> {
    const res = await api.get("/portal/student/courses");
    return res.data.data;
  }

  static async getStudentAttendance(): Promise<StudentAttendance> {
    const res = await api.get("/portal/student/attendance");
    return res.data.data;
  }

  static async getStudentGrades(): Promise<StudentGrade[]> {
    const res = await api.get("/portal/student/grades");
    return res.data.data;
  }

  static async getStudentTimetable(): Promise<TimetableSlot[]> {
    const res = await api.get("/portal/student/timetable");
    return res.data.data;
  }

  // --------- Parent Routes ---------
  static async getChildren(): Promise<Child[]> {
    const res = await api.get("/portal/parent/children");
    return res.data.data;
  }

  static async getChildAttendance(code: string, page: number = 1, limit: number = 10): Promise<ChildAttendanceData> {
    const res = await api.get<{ data: ChildAttendanceData }>(`/portal/parent/children/${code}/attendance`, { params: { page, limit } });
    return res.data.data;
  }

  static async getChildGrades(code: string): Promise<StudentGrade[]> {
    const res = await api.get(`/portal/parent/children/${code}/grades`);
    return res.data.data;
  }

  // --------- Staff Routes ---------
  static async checkIn(): Promise<any> {
    const res = await api.post("/staff/attendance/check-in");
    return res.data.data;
  }

  static async checkOut(): Promise<any> {
    const res = await api.post("/staff/attendance/check-out");
    return res.data.data;
  }

  static async getStaffMyAttendance(): Promise<StaffAttendanceData> {
    const res = await api.get("/staff/attendance/me");
    return res.data.data;
  }

  // --------- Teacher Routes ---------
  static async getTeacherAssignments(): Promise<TeacherClassInfo[]> {
    const res = await api.get("/portal/teacher/assignments");
    return res.data.data;
  }

  static async getTeacherTotalClasses(): Promise<number> {
    const res = await api.get("/portal/teacher/total-classes");
    return res.data.data;
  }

  static async getTeacherDailyHours(): Promise<TeacherDailyHours> {
    const res = await api.get("/portal/teacher/daily-hours");
    return res.data.data;
  }

  static async getTeacherStudentsPerBatch(): Promise<TeacherBatchStudents[]> {
    const res = await api.get("/portal/teacher/students-per-batch");
    return res.data.data;
  }

  static async getTeacherTotalSubjects(): Promise<number> {
    const res = await api.get("/portal/teacher/total-subjects");
    return res.data.data;
  }

  static async getTeacherAttendancePerBatch(): Promise<TeacherBatchAttendance[]> {
    const res = await api.get("/portal/teacher/attendance-per-batch");
    return res.data.data;
  }
}
