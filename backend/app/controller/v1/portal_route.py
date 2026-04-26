from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_initialization import get_db
from app.services.portal_service import StudentPortalService, ParentPortalService
from app.services.teacher_portal import TeacherPortalService

router = APIRouter(prefix="/portal", tags=["Student & Parent Portal"])

# ── Student endpoints ─────────────────────────────────────────────────────────

@router.get("/student/me")
async def student_me(request: Request, session: AsyncSession = Depends(get_db)):
    return await StudentPortalService.get_me(request, session)

@router.get("/student/courses")
async def student_courses(request: Request, session: AsyncSession = Depends(get_db)):
    return await StudentPortalService.get_my_courses(request, session)

@router.get("/student/attendance")
async def student_attendance(request: Request, session: AsyncSession = Depends(get_db)):
    return await StudentPortalService.get_my_attendance(request, session)

@router.get("/student/grades")
async def student_grades(request: Request, session: AsyncSession = Depends(get_db)):
    return await StudentPortalService.get_my_grades(request, session)

@router.get("/student/timetable")
async def student_timetable(request: Request, session: AsyncSession = Depends(get_db)):
    return await StudentPortalService.get_my_timetable(request, session)

# ── Parent endpoints ──────────────────────────────────────────────────────────

@router.get("/parent/children")
async def parent_children(request: Request, session: AsyncSession = Depends(get_db)):
    return await ParentPortalService.get_children(request, session)

@router.get("/parent/children/{student_code}/attendance")
async def child_attendance(student_code: str, request: Request, page: int = 1, limit: int = 10, session: AsyncSession = Depends(get_db)):
    return await ParentPortalService.get_child_attendance(student_code, request, session, page=page, limit=limit)

@router.get("/parent/children/{student_code}/grades")
async def child_grades(student_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await ParentPortalService.get_child_grades(student_code, request, session)

# ── Teacher endpoints ─────────────────────────────────────────────────────────

@router.get("/teacher/assignments")
async def teacher_class_information(request: Request, session: AsyncSession = Depends(get_db)):
    return await TeacherPortalService.get_my_class_information(request, session)

@router.get("/teacher/total-classes")
async def teacher_total_classes(request: Request, session: AsyncSession = Depends(get_db)):
    return await TeacherPortalService.total_classes_taught(request, session)

@router.get("/teacher/daily-hours")
async def teacher_daily_hours(request: Request, session: AsyncSession = Depends(get_db)):
    return await TeacherPortalService.total_hours_taught_daily(request, session)

@router.get("/teacher/students-per-batch")
async def teacher_students_per_batch(request: Request, session: AsyncSession = Depends(get_db)):
    return await TeacherPortalService.total_students_taught(request, session)

@router.get("/teacher/total-subjects")
async def teacher_total_subjects(request: Request, session: AsyncSession = Depends(get_db)):
    return await TeacherPortalService.total_subjects_taught(request, session)

@router.get("/teacher/attendance-per-batch")
async def teacher_attendance_per_batch(request: Request, session: AsyncSession = Depends(get_db)):
    return await TeacherPortalService.attendance_per_batch(request, session)
