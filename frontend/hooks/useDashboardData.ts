import { useQuery } from "@tanstack/react-query";
import { AdminService } from "@/services/admin.service";
import { PortalService } from "@/services/portal.service";
import { useAuth } from "@/hooks/useAuth";

export function useDashboardData(selectedChildCode?: string) {
  const { isStudent, isParent, isAdminOrSales } = useAuth();

  // Admin Data - Split into smaller queries for faster perceived loading
  const summary = useQuery({
    queryKey: ["admin", "dashboard", "summary"],
    queryFn: () => AdminService.getDashboardSummary(),
    enabled: !!isAdminOrSales,
    staleTime: 1000 * 30,
  });

  const enrollments = useQuery({
    queryKey: ["admin", "dashboard", "enrollments"],
    queryFn: () => AdminService.listEnrollments(true),
    enabled: !!isAdminOrSales,
    staleTime: 1000 * 30,
  });

  const attendance = useQuery({
    queryKey: ["admin", "dashboard", "attendance"],
    queryFn: () => AdminService.listAttendance(14), // Last 14 days for charts
    enabled: !!isAdminOrSales,
    staleTime: 1000 * 30,
  });

  const rooms = useQuery({
    queryKey: ["admin", "dashboard", "rooms"],
    queryFn: () => AdminService.listRooms(),
    enabled: !!isAdminOrSales,
    staleTime: 1000 * 30,
  });

  // Parent Data
  const children = useQuery({
    queryKey: ["parent", "children"],
    queryFn: () => PortalService.getChildren(),
    enabled: !!isParent,
  });

  const childAttendance = useQuery({
    queryKey: ["parent", "childAttendance", selectedChildCode],
    queryFn: () => PortalService.getChildAttendance(selectedChildCode!),
    enabled: !!isParent && !!selectedChildCode,
  });

  // Student Data
  const studentCourses = useQuery({
    queryKey: ["student", "courses"],
    queryFn: () => PortalService.getStudentCourses(),
    enabled: !!isStudent,
  });

  const studentAttendance = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: () => PortalService.getStudentAttendance(),
    enabled: !!isStudent,
  });

  return {
    admin: {
      data: {
        students: [], // No longer fetching full list for dashboard
        totalStudents: summary.data?.total_students || 0,
        courses: [], // No longer fetching full list for dashboard
        totalCourses: summary.data?.total_courses || 0,
        enrollments: enrollments.data || [],
        attendance: attendance.data || [],
        rooms: rooms.data || [],
        today_attendance_count: summary.data?.today_attendance_count || 0,
      },
      isLoading: {
        summary: summary.isLoading,
        enrollments: enrollments.isLoading,
        attendance: attendance.isLoading,
        rooms: rooms.isLoading,
        overall: summary.isLoading || enrollments.isLoading || attendance.isLoading || rooms.isLoading
      },
      isFetching: summary.isFetching || enrollments.isFetching || attendance.isFetching || rooms.isFetching,
      error: summary.error || enrollments.error || attendance.error || rooms.error,
      refresh: () => {
        summary.refetch();
        enrollments.refetch();
        attendance.refetch();
        rooms.refetch();
      },
    },
    parent: {
      children: children.data || [],
      childAttendance: childAttendance.data || [],
      isLoading: children.isLoading || childAttendance.isLoading,
      isFetching: children.isFetching || childAttendance.isFetching,
      error: children.error || childAttendance.error,
    },
    student: {
      courses: studentCourses.data || [],
      attendance: studentAttendance.data,
      isLoading: studentCourses.isLoading || studentAttendance.isLoading,
      error: studentCourses.error || studentAttendance.error,
    },
  };
}
