import { api } from "./api";

export interface AdminUser {
  user_id: number;
  user_code: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  data_of_birth: string | null;
  phone?: string | null;
}

export interface AdminStudent {
  user_id: number;
  user_code: string;
  username: string;
  email: string;
  role: "student";
  is_active: boolean;
  data_of_birth: string | null;
  nrc?: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  profile_picture?: string | null;
  how_did_you_hear?: string | null;
  student_type?: string | null;
}

export interface AdminStudentCreate {
  user_code?: string | null;
  username: string;
  email: string;
  password: string;
  date_of_birth?: string | null;
  is_active?: boolean;
  nrc?: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  address?: string | null;
  course_code?: string | null;
  batch_no?: string | null;
  payment_plan?: string | null;
  downpayment?: number | null;
  installment_amount?: number | null;
  department?: string;
  profile_picture?: string | null;
  how_did_you_hear?: string | null;
  student_type?: string | null;
}

export interface AdminStudentUpdate {
  username?: string;
  email?: string;
  date_of_birth?: string | null;
  is_active?: boolean;
  profile_picture?: string | null;
  how_did_you_hear?: string | null;
  student_type?: string | null;
}

export interface AdminAcademicYear {
  academic_year_id: number;
  academic_year_name: string;
  start_date: string | null;
  end_date: string | null;
}

export interface AdminAcademicYearCreate {
  academic_year_name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
}

export interface AdminAcademicYearUpdate {
  academic_year_name?: string;
  start_date?: string;
  end_date?: string;
}

export interface AdminCourse {
  course_id: number;
  course_code: string;
  course_name: string;
  academic_year_id: number;
  instructor_id: number | null;
  start_date?: string | null;
  end_date?: string | null;
  room?: string | null;
  fee_full_payment?: number | null;
  fee_installment?: number | null;
  exam_fee_gbp?: number | null;
  foc_items?: string | null;
  discount_plan?: string | null;
}

export interface AdminCourseCreate {
  course_name: string;
  academic_year_id: number;
  instructor_user_code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  room?: string | null;
  fee_full_payment?: number | null;
  fee_installment?: number | null;
  exam_fee_gbp?: number | null;
  foc_items?: string | null;
  discount_plan?: string | null;
}

export interface AdminCourseUpdate {
  course_name?: string;
  academic_year_id?: number;
  instructor_user_code?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  room?: string | null;
  fee_full_payment?: number | null;
  fee_installment?: number | null;
  exam_fee_gbp?: number | null;
  foc_items?: string | null;
  discount_plan?: string | null;
}

export interface AdminEnrollment {
  enrollment_id: number;
  enrollment_code: string;
  student_id: number;
  course_id: number;
  enrollment_date: string | null;
  status: boolean;
  // backend enriches list endpoint with these fields
  student_code?: string;
  student_name?: string;
  course_code?: string;
  course_name?: string;
  room?: string | null;
  batch_no?: string | null;
  payment_plan?: string | null;
  downpayment?: number | null;
  installment_amount?: number | null;
  course_cost?: number | null;
  foc_items?: string | null;
}

export interface AdminEnrollmentCreate {
  student_code: string;
  course_code: string;
  status?: boolean;
  batch_no?: string | null;
  payment_plan?: string | null;
  downpayment?: number | null;
  installment_amount?: number | null;
}

export interface AdminEnrollmentUpdate {
  status?: boolean;
  batch_no?: string | null;
  payment_plan?: string | null;
  downpayment?: number | null;
  installment_amount?: number | null;
}

export interface AdminAttendanceRecord {
  attendance_id: number;
  user_id: number;
  user_code?: string;
  username?: string;
  attendance_date: string; // YYYY-MM-DD
  slot: string;
  check_today: boolean;
}

export interface AdminAttendanceMark {
  student_code: string;
  slot: string;
  check_today: boolean;
  attendance_date?: string;
}

export interface AdminAttendanceUpdate {
  check_today: boolean;
}

export interface AdminRoom {
  room_id: number;
  room_name: string;
  capacity: number;
  is_active: boolean;
  current_load?: number;
  is_full?: boolean;
}

export interface AdminRoomCreate {
  room_name: string;
  capacity: number;
  is_active?: boolean;
}

export interface AdminRoomUpdate {
  room_name?: string;
  capacity?: number;
  is_active?: boolean;
}

export interface RoomAvailability {
  room: AdminRoom;
  day: string;
  busy: { start: string; end: string }[];
  free: { start: string; end: string }[];
}

export interface AdminTimeTableRow {
  timetable_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_name: string | null;
  course_id: number;
  course_code: string;
  course_name: string;
}

export interface AdminTimeTableCreate {
  course_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_name?: string | null;
}

export interface AdminTimeTableUpdate {
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  room_name?: string | null;
}

export interface AdminStudentRelations {
  student: AdminStudent;
  enrollments: AdminEnrollment[];
  attendance: { attendance_id: number; attendance_date: string; check_today: boolean }[];
  parents: { parent_code: string; parent_name: string; parent_email: string; relationship: string }[];
  payments?: AdminPayment[];
}

export interface AdminParent {
  user_id: number;
  user_code: string;
  username: string;
  email: string;
  role: "parent";
  is_active: boolean;
  data_of_birth: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminParentCreate {
  username: string;
  email: string;
  password: string;
  date_of_birth?: string | null;
  is_active?: boolean;
}

export interface AdminParentLinkChild {
  student_code: string;
  relationship_label?: string;
}

export interface AdminPayment {
  payment_id: number;
  enrollment_id: number;
  enrollment_code: string;
  amount: number;
  payment_date: string;
  month: string;
  status: string;
  student_code: string;
  student_name: string;
  course_code: string;
  course_name: string;
  payment_plan: string | null;
  payment_method?: string | null;
  course_cost?: number;
  foc_items?: string | null;
  downpayment?: number;
  installment_amount?: number;
  fine_amount?: number;
  fine_reason?: string | null;
  extra_items_fee?: number;
  extra_items?: string | null;
  exam_fee_paid_gbp?: number;
  exam_fee_paid_mmk?: number;
  exam_fee_currency?: string;
}

export interface AdminPaymentCreate {
  enrollment_id: number;
  amount: number;
  month: string;
  payment_method?: string;
  status?: string;
  fine_amount?: number | null;
  fine_reason?: string | null;
  extra_items_fee?: number | null;
  extra_items?: string | null;
  exam_fee_paid_gbp?: number | null;
  exam_fee_paid_mmk?: number | null;
  exam_fee_currency?: string | null;
}

export class AdminService {
  static async listAllUsers(): Promise<AdminUser[]> {
    const res = await api.get<{ data: AdminUser[] }>("/admin/users");
    return res.data.data;
  }

  static async createStaff(payload: any): Promise<AdminUser> {
    const res = await api.post<{ data: AdminUser }>("/admin/staff", payload);
    return res.data.data;
  }
  static async listStudents(): Promise<AdminStudent[]> {
    const res = await api.get("/admin/students");
    return res.data.data;
  }

  static async getStudent(user_code: string): Promise<AdminStudent> {
    const res = await api.get(`/admin/students/${encodeURIComponent(user_code)}`);
    return res.data.data;
  }

  static async createStudent(payload: AdminStudentCreate): Promise<AdminStudent> {
    const res = await api.post("/admin/students", payload);
    return res.data.data;
  }

  static async updateUser(user_code: string, payload: AdminStudentUpdate): Promise<void> {
    await api.put(`/admin/users/${encodeURIComponent(user_code)}`, payload);
  }

  static async deleteUser(user_code: string): Promise<void> {
    await api.delete(`/admin/users/${encodeURIComponent(user_code)}`);
  }

  static async getStudentRelations(user_code: string): Promise<AdminStudentRelations> {
    const res = await api.get(`/admin/students/${encodeURIComponent(user_code)}/relations`);
    return res.data.data;
  }

  // Parents
  static async listParents(): Promise<AdminParent[]> {
    const res = await api.get("/admin/parents");
    return res.data.data;
  }

  static async createParent(payload: AdminParentCreate): Promise<AdminParent> {
    const res = await api.post("/admin/parents", payload);
    return res.data.data;
  }

  static async linkParentChild(parent_code: string, payload: AdminParentLinkChild): Promise<void> {
    await api.post(`/admin/parents/${encodeURIComponent(parent_code)}/children`, payload);
  }

  // Academic Years
  static async listAcademicYears(): Promise<AdminAcademicYear[]> {
    const res = await api.get("/admin/academic-years");
    return res.data.data;
  }

  static async createAcademicYear(payload: AdminAcademicYearCreate): Promise<AdminAcademicYear> {
    const res = await api.post("/admin/academic-years", payload);
    return res.data.data;
  }

  static async updateAcademicYear(id: number, payload: AdminAcademicYearUpdate): Promise<AdminAcademicYear> {
    const res = await api.put(`/admin/academic-years/${id}`, payload);
    return res.data.data;
  }

  static async deleteAcademicYear(id: number): Promise<void> {
    await api.delete(`/admin/academic-years/${id}`);
  }

  // Courses
  static async listCourses(): Promise<AdminCourse[]> {
    const res = await api.get("/admin/courses");
    return res.data.data;
  }

  static async createCourse(payload: AdminCourseCreate): Promise<AdminCourse> {
    const res = await api.post("/admin/courses", payload);
    return res.data.data;
  }

  static async updateCourse(course_code: string, payload: AdminCourseUpdate): Promise<AdminCourse> {
    const res = await api.put(`/admin/courses/${encodeURIComponent(course_code)}`, payload);
    return res.data.data;
  }

  static async deleteCourse(course_code: string): Promise<void> {
    await api.delete(`/admin/courses/${encodeURIComponent(course_code)}`);
  }

  // Enrollments
  static async listEnrollments(): Promise<AdminEnrollment[]> {
    const res = await api.get("/admin/enrollments");
    return res.data.data;
  }

  static async createEnrollment(payload: AdminEnrollmentCreate): Promise<AdminEnrollment> {
    const res = await api.post("/admin/enrollments", payload);
    return res.data.data;
  }

  static async updateEnrollment(enrollment_code: string, payload: AdminEnrollmentUpdate): Promise<AdminEnrollment> {
    const res = await api.put(`/admin/enrollments/${encodeURIComponent(enrollment_code)}`, payload);
    return res.data.data;
  }

  static async deleteEnrollment(enrollment_code: string): Promise<void> {
    await api.delete(`/admin/enrollments/${encodeURIComponent(enrollment_code)}`);
  }

  // Attendance
  static async listAttendance(): Promise<AdminAttendanceRecord[]> {
    const res = await api.get("/admin/attendance");
    return res.data.data;
  }

  static async markAttendance(payload: AdminAttendanceMark): Promise<any> {
    const res = await api.post("/admin/attendance", payload);
    return res.data;
  }

  static async updateAttendance(attendance_id: number, payload: AdminAttendanceUpdate): Promise<any> {
    const res = await api.put(`/admin/attendance/${attendance_id}`, payload);
    return res.data;
  }

  // Rooms
  static async listRooms(): Promise<AdminRoom[]> {
    const res = await api.get("/admin/rooms");
    return res.data.data;
  }

  static async createRoom(payload: AdminRoomCreate): Promise<AdminRoom> {
    const res = await api.post("/admin/rooms", payload);
    return res.data.data;
  }

  static async updateRoom(room_id: number, payload: AdminRoomUpdate): Promise<AdminRoom> {
    const res = await api.put(`/admin/rooms/${room_id}`, payload);
    return res.data.data;
  }

  static async deleteRoom(room_id: number): Promise<void> {
    await api.delete(`/admin/rooms/${room_id}`);
  }

  static async getRoomAvailability(room_id: number, day: string): Promise<RoomAvailability> {
    const res = await api.get(`/admin/rooms/${room_id}/availability`, { params: { day } });
    return res.data.data;
  }

  // Timetables
  static async listTimetables(): Promise<AdminTimeTableRow[]> {
    const res = await api.get("/admin/timetables");
    return res.data.data;
  }

  static async createTimetable(payload: AdminTimeTableCreate): Promise<void> {
    await api.post("/admin/timetables", payload);
  }

  static async updateTimetable(timetable_id: number, payload: AdminTimeTableUpdate): Promise<void> {
    await api.put(`/admin/timetables/${timetable_id}`, payload);
  }

  static async deleteTimetable(timetable_id: number): Promise<void> {
    await api.delete(`/admin/timetables/${timetable_id}`);
  }

  // Purge
  static async purgeData(): Promise<void> {
    await api.post("/admin/purge-data");
  }

  // Payments
  static async listPayments(): Promise<AdminPayment[]> {
    const res = await api.get("/admin/payments");
    return res.data.data;
  }

  static async createPayment(payload: AdminPaymentCreate): Promise<void> {
    await api.post("/admin/payments", payload);
  }

  static async getActivityLogs(): Promise<any[]> {
    const res = await api.get("/admin/activity-logs");
    return res.data.data;
  }
}

