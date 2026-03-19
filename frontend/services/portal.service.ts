import { api } from "./api";

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

  static async getChildAttendance(code: string): Promise<AttendanceRecord[]> {
    const res = await api.get(`/portal/parent/children/${code}/attendance`);
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
}
