from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_initialization import get_db
from app.services.staff_service import StaffService

router = APIRouter(prefix="/staff", tags=["Staff Portal"])

# ── Self-service (HR / Manager / Sales / Teacher) ─────────────────────────────

@router.post("/attendance/check-in")
async def staff_check_in(request: Request, session: AsyncSession = Depends(get_db)):
    """Staff member checks in for today."""
    return await StaffService.check_in(request, session)

@router.post("/attendance/check-out")
async def staff_check_out(request: Request, session: AsyncSession = Depends(get_db)):
    """Staff member records check-out time."""
    return await StaffService.check_out(request, session)

@router.get("/attendance/me")
async def staff_my_attendance(request: Request, session: AsyncSession = Depends(get_db)):
    """Staff views own attendance history."""
    return await StaffService.get_my_attendance(request, session)

# ── Admin management ──────────────────────────────────────────────────────────

@router.get("/attendance")
async def all_staff_attendance(request: Request, session: AsyncSession = Depends(get_db)):
    """Admin: view all staff attendance records."""
    return await StaffService.get_all_staff_attendance(request, session)

@router.get("/attendance/{user_code}")
async def staff_attendance_by_code(user_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    """Admin: view a specific staff member's attendance."""
    return await StaffService.get_staff_attendance_by_code(user_code, request, session)

@router.post("/attendance/{user_code}/absent")
async def mark_staff_absent(user_code: str, request: Request, session: AsyncSession = Depends(get_db)):
    """Admin: manually mark a staff member as absent for today."""
    return await StaffService.admin_mark_staff_absent(user_code, request, session)
