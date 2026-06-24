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

export interface PaginatedResponse<T> {
  status_code: number;
  message: string;
  data: T[];
  pagination: {
    total_count: number;
    total_pages: number;
    current_page: number;
    limit: number;
  };
}


export interface AdminDashboardStats {
  total_students: number;
  total_courses: number;
  active_enrollments: number;
  today_attendance_count: number;
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
  gender?: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  profile_picture?: string | null;
  how_did_you_hear?: string | null;
  student_type?: string | null;
  intended_course_code?: string | null;
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
  total_fee?: number | null;
  exam_fee_gbp?: number | null;
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
  phone?: string | null;
  nrc?: string | null;
  gender?: string | null;
  address?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  how_did_you_hear?: string | null;
  student_type?: string | null;
  intended_course_code?: string | null;
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
  fee_full_payment?: number | null;
  fee_installment?: number | null;
  exam_fee_gbp?: number | null;
  foc_items?: string | null;
  foc_items_installment?: string | null;
  discount?: number | null;
  category?: string | null;
  room?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface AdminCourseCreate {
  course_name: string;
  academic_year_id: number;
  instructor_user_code?: string | null;
  fee_full_payment?: number | null;
  fee_installment?: number | null;
  exam_fee_gbp?: number | null;
  foc_items?: string | null;
  foc_items_installment?: string | null;
  category?: string | null;
  room?: string | null;
}

export interface AdminCourseUpdate {
  course_name?: string;
  academic_year_id?: number;
  instructor_user_code?: string | null;
  fee_full_payment?: number | null;
  fee_installment?: number | null;
  exam_fee_gbp?: number | null;
  foc_items?: string | null;
  foc_items_installment?: string | null;
  category?: string | null;
  room?: string | null;
}

export interface AdminBatch {
  batch_id: number;
  batch_no: string;
  course_id: number;
  course_name?: string;
  start_date?: string | null;
  end_date?: string | null;
  room?: string | null;
  instructor_id?: number | null;
  is_active: boolean;
}

export interface AdminBatchCreate {
  batch_no: string;
  course_id: number;
  start_date?: string | null;
  end_date?: string | null;
  room?: string | null;
  instructor_user_code?: string | null;
}

export interface AdminBatchUpdate {
  batch_no?: string;
  start_date?: string | null;
  end_date?: string | null;
  room?: string | null;
  instructor_user_code?: string | null;
  is_active?: boolean;
}

export interface AdminSubject {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  course_id: number;
  course_name?: string;
  is_active: boolean;
  created_at?: string | null;
}

export interface AdminSubjectCreate {
  subject_code: string;
  subject_name: string;
  course_id: number;
  is_active?: boolean;
}

export interface AdminSubjectUpdate {
  subject_code?: string;
  subject_name?: string;
  is_active?: boolean;
}

export interface AdminEnrollment {
  enrollment_id: number;
  enrollment_code: string;
  student_id: number;
  course_id: number;
  enrollment_date: string | null;
  status: boolean;
  batch_id?: number | null;
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
  total_fee?: number | null;
  exam_fee_gbp?: number | null;
  course_cost?: number | null;
  total_paid?: number;
  balance_due?: number;
  exam_fee_paid_gbp?: number;
  exam_fee_total_gbp?: number;
  exam_fee_pending_gbp?: number;
  payment_count?: number;
  foc_items?: string | null;
  profile_picture?: string | null;
  batch_start_date?: string | null;
  batch_end_date?: string | null;
}

export interface AdminEnrollmentCreate {
  student_code: string;
  course_code: string;
  status?: boolean;
  batch_no?: string | null;
  batch_id?: number | null;
  payment_plan?: string | null;
  downpayment?: number | null;
  installment_amount?: number | null;
  total_fee?: number | null;
  exam_fee_gbp?: number | null;
}

export interface AdminEnrollmentUpdate {
  status?: boolean;
  batch_no?: string | null;
  batch_id?: number | null;
  payment_plan?: string | null;
  downpayment?: number | null;
  installment_amount?: number | null;
  total_fee?: number | null;
  exam_fee_gbp?: number | null;
}

export interface AdminAttendanceRecord {
  attendance_id: number;
  user_id: number;
  user_code?: string;
  username?: string;
  attendance_date: string; // YYYY-MM-DD
  slot: string;
  check_today: boolean;
  timetable_id?: number | null;
  teacher_name?: string | null;
  time_range?: string | null;
  course_name?: string | null;
  subject_name?: string | null;
}

export interface AdminAttendanceMark {
  student_code: string;
  slot: string;
  timetable_id?: number | null;
  course_id?: number | null;
  subject_id?: number | null;
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
  batch_id?: number | null;
  batch_no?: string | null;
  teacher_id?: number | null;
  teacher_code?: string | null;
  teacher_name?: string | null;
  subject_id?: number | null;
  subject_code?: string | null;
  subject_name?: string | null;
}

export interface AdminTimeTableCreate {
  course_code: string;
  batch_no?: string | null;
  batch_id?: number | null;
  teacher_code?: string | null;
  subject_code?: string | null;
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
  batch_no?: string | null;
  batch_id?: number | null;
  teacher_code?: string | null;
  subject_code?: string | null;
}


export interface AdminStudentRelations {
  student: AdminStudent;
  enrollments: AdminEnrollment[];
  attendance: { attendance_id: number; attendance_date: string; check_today: boolean }[];
  parents: { parent_code: string; parent_name: string; parent_email: string; relationship: string }[];
  payments?: AdminPayment[];
}

export interface TeachingHoursReport {
  teacher_code: string;
  teacher_name: string;
  total_hours: number;
  courses: string[];
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
  receipt_id?: string | null;
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
  amount_2?: number;
  payment_method_2?: string | null;
  course_cost?: number;
  foc_items?: string | null;
  downpayment?: number;
  installment_amount?: number;
  fine_amount?: number;
  fine_reason?: string | null;
  extra_items_fee?: number;
  extra_items?: string | null;
  extra_items_payment_method?: string | null;
  exam_fee_paid_gbp?: number;
  exam_fee_paid_mmk?: number;
  exam_fee_currency?: string;
  exam_fee_payment_method?: string | null;
  discount_amount?: number;
}

export interface WeeklyIncomeStat {
  week_starting: string;
  label: string;
  total_mmk: number;
  total_gbp: number;
  payment_count: number;
  fine_mmk: number;
  extra_mmk: number;
  tuition_mmk: number;
  exam_mmk: number;
}

export interface MonthlyIncomeStat {
  month: string;
  label: string;
  total_mmk: number;
  total_gbp: number;
  payment_count: number;
  fine_mmk: number;
  extra_mmk: number;
  tuition_mmk: number;
  exam_mmk: number;
}

export interface DailyIncomeStat {
  day: string;
  label: string;
  total_mmk: number;
  total_gbp: number;
  payment_count: number;
  fine_mmk: number;
  extra_mmk: number;
  tuition_mmk: number;
  exam_mmk: number;
}

export interface IncomeReportData {
  daily_stats: DailyIncomeStat[];
  weekly_stats: WeeklyIncomeStat[];
  monthly_stats: MonthlyIncomeStat[];
  payment_records: AdminPayment[];
}

export interface Account {
  account_id: number;
  account_name: string;
  account_type: string;
  currency: string;
  is_active: boolean;
  balance_mmk: number;
  balance_gbp: number;
  debit_mmk: number;
  credit_mmk: number;
  debit_gbp: number;
  credit_gbp: number;
}

export interface AccountCreate {
  account_name: string;
  account_type: string;
  currency?: string;
}

export interface JournalEntryLine {
  line_id?: number;
  account_id: number;
  account_name?: string;
  debit_mmk?: number;
  credit_mmk?: number;
  debit_gbp?: number;
  credit_gbp?: number;
}

export interface JournalEntry {
  entry_id: number;
  entry_date: string;
  description: string;
  reference?: string | null;
  entry_type: string;
  student_id?: number | null;
  student_name?: string | null;
  lines: JournalEntryLine[];
}

export interface JournalEntryCreate {
  entry_date?: string | null;
  description: string;
  reference?: string | null;
  entry_type?: string;
  student_id?: number | null;
  lines: {
    account_id: number;
    debit_mmk?: number;
    credit_mmk?: number;
    debit_gbp?: number;
    credit_gbp?: number;
  }[];
}

export interface BookLogEntry {
  line_id: number;
  entry_id: number;
  entry_date: string;
  description: string;
  reference?: string | null;
  account_name: string;
  debit_mmk: number;
  credit_mmk: number;
  debit_gbp: number;
  credit_gbp: number;
  balance_mmk: number;
  balance_gbp: number;
}

export interface StudentLedgerEntry {
  entry_id: number;
  entry_date: string;
  description: string;
  reference?: string | null;
  entry_type: string;
  account_name: string;
  debit_mmk: number;
  credit_mmk: number;
  debit_gbp: number;
  credit_gbp: number;
}

export interface TrialBalance {
  lines: {
    account_id: number;
    account_name: string;
    account_type: string;
    debit_mmk: number;
    credit_mmk: number;
    debit_gbp: number;
    credit_gbp: number;
  }[];
  totals: {
    debit_mmk: number;
    credit_mmk: number;
    debit_gbp: number;
    credit_gbp: number;
    is_balanced: boolean;
  };
}

export interface IncomeStatement {
  revenues: {
    account_name: string;
    amount_mmk: number;
    amount_gbp: number;
  }[];
  expenses: {
    account_name: string;
    amount_mmk: number;
    amount_gbp: number;
  }[];
  summary: {
    total_revenue_mmk: number;
    total_revenue_gbp: number;
    total_expense_mmk: number;
    total_expense_gbp: number;
    net_income_mmk: number;
    net_income_gbp: number;
  };
}

export interface BalanceSheet {
  assets: {
    account_name: string;
    amount_mmk: number;
    amount_gbp: number;
  }[];
  liabilities: {
    account_name: string;
    amount_mmk: number;
    amount_gbp: number;
  }[];
  equity: {
    account_name: string;
    amount_mmk: number;
    amount_gbp: number;
  }[];
  summary: {
    total_assets_mmk: number;
    total_assets_gbp: number;
    total_liabilities_mmk: number;
    total_liabilities_gbp: number;
    total_equity_mmk: number;
    total_equity_gbp: number;
    total_liabilities_equity_mmk: number;
    total_liabilities_equity_gbp: number;
  };
}

export interface Expense {
  expense_id: number;
  title: string;
  description?: string | null;
  amount_mmk: number;
  category: string;
  expense_date: string;
  status: string;
  approved_by?: number | null;
  approver_name?: string | null;
  department?: string | null;
  budget_amount?: number | null;
  payment_method: string;
  created_at: string;
}

export interface ExpenseCreate {
  title: string;
  description?: string | null;
  amount_mmk: number;
  category: string;
  expense_date?: string | null;
  department?: string | null;
  budget_amount?: number | null;
  payment_method?: string;
}

export interface BudgetVsActual {
  category: string;
  actual_mmk: number;
  budget_mmk: number;
  variance_mmk: number;
}

export interface AdminPaymentCreate {
  enrollment_id: number;
  amount: number;
  month: string;
  payment_method?: string;
  amount_2?: number | null;
  payment_method_2?: string | null;
  status?: string;
  fine_amount?: number | null;
  fine_reason?: string | null;
  extra_items_fee?: number | null;
  extra_items?: string | null;
  extra_items_payment_method?: string | null;
  exam_fee_paid_gbp?: number | null;
  exam_fee_paid_mmk?: number | null;
  exam_fee_currency?: string | null;
  exam_fee_payment_method?: string | null;
  discount_amount?: number | null;
  payment_date?: string | null;
}

export class AdminService {
  static async getDashboardSummary(): Promise<AdminDashboardStats> {
    const res = await api.get<{ data: AdminDashboardStats }>("/admin/dashboard/summary");
    return res.data.data;
  }

  static async listAllUsers(): Promise<AdminUser[]> {
    const res = await api.get<{ data: AdminUser[] }>("/admin/users");
    return res.data.data;
  }

  static async createStaff(payload: any): Promise<AdminUser> {
    const res = await api.post<{ data: AdminUser }>("/admin/staff", payload);
    return res.data.data;
  }
  static async listStudents(page: number = 1, limit: number = 50): Promise<PaginatedResponse<AdminStudent>> {
    const res = await api.get<PaginatedResponse<AdminStudent>>("/admin/students", { params: { page, limit } });
    return res.data;
  }


  static async getStudent(user_code: string): Promise<AdminStudent> {
    const res = await api.get(`/admin/students/${encodeURIComponent(user_code)}`);
    return res.data.data;
  }

  static async createStudent(payload: AdminStudentCreate): Promise<AdminStudent> {
    const res = await api.post("/admin/students", payload);
    return res.data.data;
  }

  static async approveStudent(userId: number, payload: { user_code?: string, auto_prefix?: string }): Promise<void> {
    await api.post(`/admin/students/${userId}/approve`, payload);
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

  static async updateEnrollment(enrollment_code: string, payload: any): Promise<void> {
    await api.put(`/admin/enrollments/${enrollment_code}`, payload);
  }

  // Parents
  static async listParents(page: number = 1, limit: number = 50): Promise<PaginatedResponse<AdminUser>> {
    const res = await api.get<PaginatedResponse<AdminUser>>("/admin/parents", { params: { page, limit } });
    return res.data;
  }

  // Teachers
  static async listTeachers(page: number = 1, limit: number = 50): Promise<PaginatedResponse<AdminUser>> {
    const res = await api.get<PaginatedResponse<AdminUser>>("/admin/teachers", { params: { page, limit } });
    return res.data;
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
  static async listCourses(page: number = 1, limit: number = 50): Promise<PaginatedResponse<AdminCourse>> {
    const res = await api.get<PaginatedResponse<AdminCourse>>("/admin/courses", { params: { page, limit } });
    return res.data;
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
  static async listEnrollments(status?: boolean, page: number = 1, limit: number = 50): Promise<PaginatedResponse<AdminEnrollment>> {
    const res = await api.get<PaginatedResponse<AdminEnrollment>>("/admin/enrollments", { params: { status, page, limit } });
    return res.data;
  }

  static async createEnrollment(payload: AdminEnrollmentCreate): Promise<AdminEnrollment> {
    const res = await api.post("/admin/enrollments", payload);
    return res.data.data;
  }

  static async deleteEnrollment(enrollment_code: string): Promise<void> {
    await api.delete(`/admin/enrollments/${enrollment_code}`);
  }

  // Attendance
  static async listAttendance(days?: number): Promise<AdminAttendanceRecord[]> {
    const res = await api.get("/admin/attendance", { params: { days } });
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

  static async getTeachingHoursReport(): Promise<TeachingHoursReport[]> {
    const res = await api.get<{ data: TeachingHoursReport[] }>("/admin/teaching-hours");
    return res.data.data;
  }

  // Purge
  static async purgeData(): Promise<void> {
    await api.post("/admin/purge-data");
  }

  // Payments
  static async listPayments(page: number = 1, limit: number = 50, enrollmentId?: number): Promise<PaginatedResponse<AdminPayment>> {
    const res = await api.get<PaginatedResponse<AdminPayment>>("/admin/payments", { params: { page, limit, enrollment_id: enrollmentId } });
    return res.data;
  }

  static async getIncomeReport(startDate?: string, endDate?: string): Promise<IncomeReportData> {
    const res = await api.get<{ data: IncomeReportData }>("/admin/payments/income-report", {
      params: { start_date: startDate, end_date: endDate }
    });
    return res.data.data;
  }

  static async createPayment(payload: AdminPaymentCreate): Promise<void> {
    await api.post("/admin/payments", payload);
  }

  static async updatePayment(paymentId: number, payload: Partial<AdminPaymentCreate>): Promise<void> {
    await api.put(`/admin/payments/${paymentId}`, payload);
  }

  static async deletePayment(paymentId: number): Promise<void> {
    await api.delete(`/admin/payments/${paymentId}`);
  }

  static async getActivityLogs(page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const res = await api.get<PaginatedResponse<any>>("/admin/activity-logs", { params: { page, limit } });
    return res.data;
  }


  static async deleteActivityLog(logId: number): Promise<void> {
    await api.delete(`/admin/activity-logs/${logId}`);
  }

  static async clearAllActivityLogs(): Promise<void> {
    await api.delete("/admin/activity-logs");
  }

  // Backup and Restore
  static async exportBackup(): Promise<Blob> {
    const res = await api.get("/admin/backup/export", { responseType: 'blob' });
    return res.data;
  }

  static async importBackup(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post("/admin/backup/import", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }

  static async changeUserPassword(userCode: string, payload: { new_password: string }): Promise<void> {
    await api.put(`/admin/users/${encodeURIComponent(userCode)}/password`, payload);
  }

  static async changeSelfPassword(payload: { old_password: string, new_password: string }): Promise<void> {
    await api.put("/admin/profile/password", payload);
  }

  // Batches
  static async listBatches(courseId?: number): Promise<PaginatedResponse<AdminBatch>> {
    const res = await api.get<PaginatedResponse<AdminBatch>>("/admin/batches", { params: { course_id: courseId } });
    return res.data;
  }

  static async createBatch(payload: AdminBatchCreate): Promise<AdminBatch> {
    const res = await api.post<{ data: AdminBatch }>("/admin/batches", payload);
    return res.data.data;
  }

  static async updateBatch(id: number, payload: AdminBatchUpdate): Promise<AdminBatch> {
    const res = await api.put<{ data: AdminBatch }>(`/admin/batches/${id}`, payload);
    return res.data.data;
  }

  static async deleteBatch(id: number): Promise<void> {
    await api.delete(`/admin/batches/${id}`);
  }

  // Subjects
  static async listSubjects(courseId?: number): Promise<PaginatedResponse<AdminSubject>> {
    const res = await api.get<PaginatedResponse<AdminSubject>>("/admin/subjects", { params: { course_id: courseId } });
    return res.data;
  }

  static async createSubject(payload: AdminSubjectCreate): Promise<AdminSubject> {
    const res = await api.post<{ data: AdminSubject }>("/admin/subjects", payload);
    return res.data.data;
  }

  static async updateSubject(id: number, payload: AdminSubjectUpdate): Promise<AdminSubject> {
    const res = await api.put<{ data: AdminSubject }>(`/admin/subjects/${id}`, payload);
    return res.data.data;
  }

  static async deleteSubject(id: number): Promise<void> {
    await api.delete(`/admin/subjects/${id}`);
  }

  // Accounting & Ledgers
  static async listAccounts(): Promise<Account[]> {
    const res = await api.get<{ data: Account[] }>("/admin/accounting/accounts");
    return res.data.data;
  }

  static async createAccount(payload: AccountCreate): Promise<{ account_id: number; account_name: string }> {
    const res = await api.post<{ data: { account_id: number; account_name: string } }>("/admin/accounting/accounts", payload);
    return res.data.data;
  }

  static async listJournalEntries(startDate?: string, endDate?: string): Promise<JournalEntry[]> {
    const res = await api.get<{ data: JournalEntry[] }>("/admin/accounting/journal-entries", {
      params: { start_date: startDate, end_date: endDate }
    });
    return res.data.data;
  }

  static async createJournalEntry(payload: JournalEntryCreate): Promise<{ entry_id: number; description: string }> {
    const res = await api.post<{ data: { entry_id: number; description: string } }>("/admin/accounting/journal-entries", payload);
    return res.data.data;
  }

  static async getCashBook(): Promise<BookLogEntry[]> {
    const res = await api.get<{ data: BookLogEntry[] }>("/admin/accounting/cash-book");
    return res.data.data;
  }

  static async getBankBook(): Promise<BookLogEntry[]> {
    const res = await api.get<{ data: BookLogEntry[] }>("/admin/accounting/bank-book");
    return res.data.data;
  }

  static async getStudentLedger(studentId: number): Promise<StudentLedgerEntry[]> {
    const res = await api.get<{ data: StudentLedgerEntry[] }>(`/admin/accounting/student-ledger/${studentId}`);
    return res.data.data;
  }

  static async getTrialBalance(): Promise<TrialBalance> {
    const res = await api.get<{ data: TrialBalance }>("/admin/accounting/trial-balance");
    return res.data.data;
  }

  static async getIncomeStatement(): Promise<IncomeStatement> {
    const res = await api.get<{ data: IncomeStatement }>("/admin/accounting/income-statement");
    return res.data.data;
  }

  static async getBalanceSheet(): Promise<BalanceSheet> {
    const res = await api.get<{ data: BalanceSheet }>("/admin/accounting/balance-sheet");
    return res.data.data;
  }

  static async listExpenses(filters?: { start_date?: string; end_date?: string; category?: string; status?: string; department?: string }): Promise<Expense[]> {
    const res = await api.get<{ data: Expense[] }>("/admin/accounting/expenses", { params: filters });
    return res.data.data;
  }

  static async createExpense(payload: ExpenseCreate): Promise<{ expense_id: number; title: string }> {
    const res = await api.post<{ data: { expense_id: number; title: string } }>("/admin/accounting/expenses", payload);
    return res.data.data;
  }

  static async approveExpense(expenseId: number): Promise<{ expense_id: number; status: string }> {
    const res = await api.post<{ data: { expense_id: number; status: string } }>(`/admin/accounting/expenses/${expenseId}/approve`);
    return res.data.data;
  }

  static async rejectExpense(expenseId: number): Promise<{ expense_id: number; status: string }> {
    const res = await api.post<{ data: { expense_id: number; status: string } }>(`/admin/accounting/expenses/${expenseId}/reject`);
    return res.data.data;
  }

  static async getBudgetVsActual(): Promise<BudgetVsActual[]> {
    const res = await api.get<{ data: BudgetVsActual[] }>("/admin/accounting/budget-vs-actual");
    return res.data.data;
  }
}

