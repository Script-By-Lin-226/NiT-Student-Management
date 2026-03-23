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

// --- Mutations ---

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => AdminService.deleteUser(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.students() });
    },
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => AdminService.createStudent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.students() });
    },
  });
}

export function useDeleteActivityLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => AdminService.deleteActivityLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.activityLogs() });
    },
  });
}

export function useClearActivityLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => AdminService.clearAllActivityLogs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.activityLogs() });
    },
  });
}
