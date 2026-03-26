import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminService } from "@/services/admin.service";

// Keys for caching
export const adminKeys = {
  all: ["admin"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  students: () => [...adminKeys.all, "students"] as const,
  student: (code: string) => [...adminKeys.students(), code] as const,
  teachers: () => [...adminKeys.all, "teachers"] as const,
  parents: () => [...adminKeys.all, "parents"] as const,
  academicYears: () => [...adminKeys.all, "academic-years"] as const,
  courses: () => [...adminKeys.all, "courses"] as const,
  enrollments: () => [...adminKeys.all, "enrollments"] as const,
  attendance: () => [...adminKeys.all, "attendance"] as const,
  rooms: () => [...adminKeys.all, "rooms"] as const,
  timetables: () => [...adminKeys.all, "timetables"] as const,
  payments: () => [...adminKeys.all, "payments"] as const,
  activityLogs: () => [...adminKeys.all, "activity-logs"] as const,
  batches: (courseId?: number) => [...adminKeys.all, "batches", courseId] as const,
  subjects: (courseId?: number) => [...adminKeys.all, "subjects", courseId] as const,
};

// --- Queries ---

export function useStudents(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: [...adminKeys.students(), page, limit],
    queryFn: () => AdminService.listStudents(page, limit),
  });
}

export function useStudent(code: string) {
  return useQuery({
    queryKey: adminKeys.student(code),
    queryFn: () => AdminService.getStudent(code),
    enabled: !!code,
  });
}

export function useAcademicYears() {
  return useQuery({
    queryKey: adminKeys.academicYears(),
    queryFn: () => AdminService.listAcademicYears(),
  });
}

export function useCourses() {
  return useQuery({
    queryKey: adminKeys.courses(),
    queryFn: () => AdminService.listCourses(),
  });
}

export function useActivityLogs(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: [...adminKeys.activityLogs(), page, limit],
    queryFn: () => AdminService.getActivityLogs(page, limit),
  });
}

export function useEnrollments() {
  return useQuery({
    queryKey: adminKeys.enrollments(),
    queryFn: () => AdminService.listEnrollments(),
  });
}

export function useAttendance() {
  return useQuery({
    queryKey: adminKeys.attendance(),
    queryFn: () => AdminService.listAttendance(),
  });
}

export function useTimetables() {
  return useQuery({
    queryKey: adminKeys.timetables(),
    queryFn: () => AdminService.listTimetables(),
  });
}

export function useBatches(courseId?: number) {
  return useQuery({
    queryKey: adminKeys.batches(courseId),
    queryFn: () => AdminService.listBatches(courseId),
  });
}

export function useSubjects(courseId?: number) {
  return useQuery({
    queryKey: adminKeys.subjects(courseId),
    queryFn: () => AdminService.listSubjects(courseId),
  });
}

// --- Mutations ---

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => AdminService.deleteUser(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createStudent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteActivityLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => AdminService.deleteActivityLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useClearActivityLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => AdminService.clearAllActivityLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: any }) =>
      AdminService.updateUser(code, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.markAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => AdminService.updateAttendance(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// Course Mutations
export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createCourse(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: any }) => AdminService.updateCourse(code, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => AdminService.deleteCourse(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

// Enrollment Mutations
export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createEnrollment(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useUpdateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, payload }: { code: string; payload: any }) => AdminService.updateEnrollment(code, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => AdminService.deleteEnrollment(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

// Payment Mutations
export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createPayment(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

// Approval Mutations
export function useApproveStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => AdminService.approveStudent(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

// Academic Year Mutations
export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createAcademicYear(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => AdminService.updateAcademicYear(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useDeleteAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => AdminService.deleteAcademicYear(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

// Batch Mutations
export function useCreateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createBatch(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => AdminService.updateBatch(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => AdminService.deleteBatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

// Subject Mutations
export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createSubject(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => AdminService.updateSubject(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => AdminService.deleteSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}
