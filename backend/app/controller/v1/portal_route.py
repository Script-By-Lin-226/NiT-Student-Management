from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_initialization import get_db
from app.services.portal_service import StudentPortalService, ParentPortalService

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
async def child_attendance(student_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await ParentPortalService.get_child_attendance(student_code, request, session)

@router.get("/parent/children/{student_code}/grades")
async def child_grades(student_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    return await ParentPortalService.get_child_grades(student_code, request, session)
