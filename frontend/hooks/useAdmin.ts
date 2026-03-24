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
