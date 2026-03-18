from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date
from app.models.model import User, StaffAttendance
from app.services.rbac_portal import validating_staff_role, validating_admin_role
from app.schemas.attendance import AttendanceMarkRequest


STAFF_ROLES = {"hr", "manager", "sales", "teacher"}


def _user_from_request(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


class StaffService:

    # ── Self check-in (staff marks their own attendance) ──────────────────────

    async def check_in(request: Request, session: AsyncSession):
        """Staff member checks in for today."""
        await validating_staff_role(request)
        user_code = _user_from_request(request).get("user_code")

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        staff = user_r.scalars().first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        today = date.today()
        dup_q = select(StaffAttendance).where(
            and_(StaffAttendance.user_id == staff.user_id, StaffAttendance.attendance_date == today)
        )
        dup_r = await session.execute(dup_q)
        existing = dup_r.scalars().first()
        if existing:
            return JSONResponse({
                "success": False,
                "error": {"code": "ALREADY_CHECKED_IN", "message": f"Already checked in for {today}"}
            }, status_code=409)

        from datetime import datetime
        record = StaffAttendance(
            user_id=staff.user_id,
            attendance_date=today,
            check_in_time=datetime.now().strftime("%H:%M"),
            status="present"
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return JSONResponse({
            "success": True,
            "data": {
                "attendance_id": record.attendance_id,
                "date": str(record.attendance_date),
                "check_in_time": record.check_in_time,
                "status": record.status
            },
            "error": None
        }, status_code=201)

    async def check_out(request: Request, session: AsyncSession):
        """Staff member records their check-out time."""
        await validating_staff_role(request)
        user_code = _user_from_request(request).get("user_code")

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        staff = user_r.scalars().first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        today = date.today()
        q = select(StaffAttendance).where(
            and_(StaffAttendance.user_id == staff.user_id, StaffAttendance.attendance_date == today)
        )
        r = await session.execute(q)
        record = r.scalars().first()
        if not record:
            return JSONResponse({
                "success": False,
                "error": {"code": "NO_CHECK_IN", "message": "No check-in record found for today. Check in first."}
            }, status_code=404)

        from datetime import datetime
        record.check_out_time = datetime.now().strftime("%H:%M")
        await session.commit()
        return JSONResponse({
            "success": True,
            "data": {
                "attendance_id": record.attendance_id,
                "date": str(record.attendance_date),
                "check_in_time": record.check_in_time,
                "check_out_time": record.check_out_time,
                "status": record.status
            },
            "error": None
        })

    async def get_my_attendance(request: Request, session: AsyncSession):
        """Staff views their own attendance history."""
        await validating_staff_role(request)
        user_code = _user_from_request(request).get("user_code")

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        staff = user_r.scalars().first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff member not found")

        q = select(StaffAttendance).where(StaffAttendance.user_id == staff.user_id)
        r = await session.execute(q)
        records = r.scalars().all()

        total = len(records)
        present = sum(1 for rec in records if rec.status == "present")
        rate = round((present / total * 100), 1) if total else 0

        data = [
            {
                "attendance_id": rec.attendance_id,
                "date": str(rec.attendance_date),
                "check_in_time": rec.check_in_time,
                "check_out_time": rec.check_out_time,
                "status": rec.status,
                "note": rec.note
            }
            for rec in records
        ]
        return JSONResponse({
            "success": True,
            "data": {"records": data, "summary": {"total": total, "present": present, "rate": rate}},
            "error": None
        })

    # ── Admin: view / manage all staff attendance ─────────────────────────────

    async def get_all_staff_attendance(request: Request, session: AsyncSession):
        """Admin views attendance for all staff."""
        await validating_admin_role(request)

        q = (
            select(StaffAttendance, User)
            .join(User, StaffAttendance.user_id == User.user_id)
        )
        r = await session.execute(q)
        rows = r.all()
        data = [
            {
                "attendance_id": rec.attendance_id,
                "date": str(rec.attendance_date),
                "check_in_time": rec.check_in_time,
                "check_out_time": rec.check_out_time,
                "status": rec.status,
                "note": rec.note,
                "staff": {
                    "user_code": u.user_code,
                    "username": u.username,
                    "role": u.role
                }
            }
            for rec, u in rows
        ]
        return JSONResponse({"success": True, "data": data, "error": None})

    async def get_staff_attendance_by_code(user_code: str, request: Request, session: AsyncSession):
        """Admin views a specific staff member's attendance."""
        await validating_admin_role(request)

        user_q = select(User).where(
            and_(User.user_code == user_code, User.role.in_(list(STAFF_ROLES)))
        )
        user_r = await session.execute(user_q)
        staff = user_r.scalars().first()
        if not staff:
            return JSONResponse({
                "success": False,
                "error": {"code": "STAFF_NOT_FOUND", "message": f"Staff member '{user_code}' not found"}
            }, status_code=404)

        q = select(StaffAttendance).where(StaffAttendance.user_id == staff.user_id)
        r = await session.execute(q)
        records = r.scalars().all()
        data = [
            {
                "attendance_id": rec.attendance_id,
                "date": str(rec.attendance_date),
                "check_in_time": rec.check_in_time,
                "check_out_time": rec.check_out_time,
                "status": rec.status,
                "note": rec.note
            }
            for rec in records
        ]
        return JSONResponse({"success": True, "data": data, "error": None})

    async def admin_mark_staff_absent(user_code: str, request: Request, session: AsyncSession):
        """Admin manually marks a staff as absent for today."""
        await validating_admin_role(request)

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        staff = user_r.scalars().first()
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")

        today = date.today()
        dup_q = select(StaffAttendance).where(
            and_(StaffAttendance.user_id == staff.user_id, StaffAttendance.attendance_date == today)
        )
        dup_r = await session.execute(dup_q)
        existing = dup_r.scalars().first()
        if existing:
            return JSONResponse({
                "success": False,
                "error": {"code": "ALREADY_EXISTS", "message": f"Attendance already recorded for {today}"}
            }, status_code=409)

        record = StaffAttendance(
            user_id=staff.user_id,
            attendance_date=today,
            status="absent"
        )
        session.add(record)
        await session.commit()
        return JSONResponse({
            "success": True,
            "data": {"user_code": user_code, "date": str(today), "status": "absent"},
            "error": None
        }, status_code=201)
