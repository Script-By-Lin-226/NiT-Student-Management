from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_initialization import get_db
from app.services.admin_panel import AdminPanelService
from app.schemas.user import UserUpdate, AdminStudentCreate, AdminParentCreate, AdminParentLinkChild
from app.schemas.academic_year import AdminAcademicYearCreate, AdminAcademicYearUpdate
from app.schemas.course import AdminCourseCreate, AdminCourseUpdate
from app.schemas.enrollment import AdminEnrollmentCreate, AdminEnrollmentUpdate
from app.schemas.attendance import AttendanceMarkRequest, AttendanceUpdateRequest
from app.schemas.room import AdminRoomCreate, AdminRoomUpdate
from app.schemas.time_table import AdminTimeTableCreate, AdminTimeTableUpdate
from app.schemas.payment import PaymentCreate, PaymentUpdate

router = APIRouter(prefix="/admin", tags=["Admin Panel"])

# --- User CRUD ---

@router.get("/users")
async def get_all_users(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_all_users(request, session)

@router.get("/students")
async def get_students_details(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_students_details(request, session)

@router.post("/students")
async def create_student(payload: AdminStudentCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_student(payload, request, session)

@router.get("/students/{user_code}")
async def get_specific_student(user_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_specific_student(user_code, request, session)

@router.get("/students/{user_code}/relations")
async def get_student_relations(user_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_student_relations(user_code, request, session)

@router.get("/teachers")
async def get_teachers_details(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_teachers_details(request, session)

@router.get("/teachers/{user_code}")
async def get_specific_teacher(user_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_specific_teacher(user_code, request, session)

@router.get("/parents")
async def get_parents_details(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_parents_details(request, session)

@router.post("/parents")
async def create_parent(payload: AdminParentCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_parent(payload, request, session)

@router.get("/parents/{user_code}")
async def get_specific_parent(user_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_specific_parent(user_code, request, session)

@router.post("/parents/{parent_code}/children")
async def link_parent_child(parent_code: str, payload: AdminParentLinkChild, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.link_parent_child(parent_code, payload, request, session)

@router.put("/users/{user_code}")
async def update_user(user_code: str, user_update: UserUpdate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.update_user(user_code, user_update, request, session)

@router.delete("/users/{user_code}")
async def delete_user(user_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.delete_user(user_code, request, session)

# --- Sample Data (dev helper) ---

@router.post("/seed-sample")
async def seed_sample(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.seed_sample_data(request, session)

@router.post("/purge-data")
async def purge_data(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.purge_all_data_except_admin(request, session)

# --- Rooms CRUD + Availability ---

@router.get("/rooms")
async def list_rooms(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.list_rooms(request, session)

@router.post("/rooms")
async def create_room(payload: AdminRoomCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_room(request, session, payload)

@router.put("/rooms/{room_id}")
async def update_room(room_id: int, payload: AdminRoomUpdate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.update_room(request, session, room_id, payload)

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: int, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.delete_room(request, session, room_id)

@router.get("/rooms/{room_id}/availability")
async def room_availability(room_id: int, request: Request, session: AsyncSession = Depends(get_db), day: str = "Monday"):
    return await AdminPanelService.get_room_availability(request, session, room_id, day)

# --- Timetables CRUD ---

@router.get("/timetables")
async def list_timetables(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.list_timetables(request, session)

@router.post("/timetables")
async def create_timetable(payload: AdminTimeTableCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_timetable(request, session, payload)

@router.put("/timetables/{timetable_id}")
async def update_timetable(timetable_id: int, payload: AdminTimeTableUpdate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.update_timetable(request, session, timetable_id, payload)

@router.delete("/timetables/{timetable_id}")
async def delete_timetable(timetable_id: int, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.delete_timetable(request, session, timetable_id)

# --- Academic Year CRUD ---

@router.post("/academic-years")
async def assign_academic_year(payload: AdminAcademicYearCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_academic_year(request, session, payload)

@router.get("/academic-years")
async def get_all_academic_years(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_all_academic_years(request, session)

@router.get("/academic-years/{academic_year_id}")
async def get_specific_academic_detail(academic_year_id: int, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_specific_academic_details(academic_year_id, request, session)

@router.put("/academic-years/{academic_year_id}")
async def update_academic_year(academic_year_id: int, payload: AdminAcademicYearUpdate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.update_academic_year(academic_year_id, request, session, payload)

@router.delete("/academic-years/{academic_year_id}")
async def delete_academic_year(academic_year_id: int, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.delete_academic_year(academic_year_id, request, session)

@router.get("/attendance")
async def get_all_attendance(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_all_attendance(request, session)

@router.post("/attendance")
async def mark_attendance(payload: AttendanceMarkRequest, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.mark_attendance(request, session, payload)

@router.put("/attendance/{attendance_id}")
async def update_attendance(attendance_id: int, payload: AttendanceUpdateRequest, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.update_attendance(request, session, attendance_id, payload)

@router.get("/attendance/{student_code}")
async def get_specific_attendance(student_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.get_specific_attendance(student_code, request, session)

# --- Courses CRUD ---

@router.get("/courses")
async def list_courses(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.list_courses(request, session)

@router.post("/courses")
async def create_course(payload: AdminCourseCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_course(request, session, payload)

@router.put("/courses/{course_code}")
async def update_course(course_code: str, payload: AdminCourseUpdate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.update_course(request, session, course_code, payload)

@router.delete("/courses/{course_code}")
async def delete_course(course_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.delete_course(request, session, course_code)

# --- Enrollments CRUD ---

@router.get("/enrollments")
async def list_enrollments(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.list_enrollments(request, session)

@router.post("/enrollments")
async def create_enrollment(payload: AdminEnrollmentCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_enrollment(request, session, payload)

@router.put("/enrollments/{enrollment_code}")
async def update_enrollment(enrollment_code: str, payload: AdminEnrollmentUpdate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.update_enrollment(request, session, enrollment_code, payload)

@router.delete("/enrollments/{enrollment_code}")
async def delete_enrollment(enrollment_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.delete_enrollment(request, session, enrollment_code)

# --- Payments CRUD ---

@router.get("/payments")
async def list_payments(request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.list_payments(request, session)

@router.post("/payments")
async def create_payment(payload: PaymentCreate, request: Request, session: AsyncSession = Depends(get_db)):
    return await AdminPanelService.create_payment(request, session, payload)

