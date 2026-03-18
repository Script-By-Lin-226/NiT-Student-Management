from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.model import User, Enrollment, Course, Grade, TimeTable, Attendance, ParentStudent
from app.services.rbac_portal import validating_student_role, validating_parent_role


def _user_from_request(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ═══════════════════════════════════════════════════════════════════════════════
# Student Portal Service
# ═══════════════════════════════════════════════════════════════════════════════

class StudentPortalService:

    async def get_me(request: Request, session: AsyncSession):
        await validating_student_role(request)
        user_code = _user_from_request(request).get("user_code")
        q = select(User).where(User.user_code == user_code)
        result = await session.execute(q)
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return JSONResponse({
            "success": True,
            "data": {
                "user_id": user.user_id,
                "user_code": user.user_code,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_active": user.is_active,
            },
            "error": None
        })

    async def get_my_courses(request: Request, session: AsyncSession):
        await validating_student_role(request)
        user_code = _user_from_request(request).get("user_code")

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        user = user_r.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")

        q = (
            select(Enrollment, Course)
            .join(Course, Enrollment.course_id == Course.course_id)
            .where(Enrollment.student_id == user.user_id)
        )
        result = await session.execute(q)
        rows = result.all()

        data = [
            {
                "enrollment_id": e.enrollment_id,
                "enrollment_code": e.enrollment_code,
                "enrollment_date": str(e.enrollment_date),
                "status": "Active" if e.status else "Inactive",
                "course": {
                    "course_id": c.course_id,
                    "course_code": c.course_code,
                    "course_name": c.course_name,
                    "start_date": c.start_date,
                    "room": c.room,
                }
            }
            for e, c in rows
        ]
        return JSONResponse({"success": True, "data": data, "error": None})

    async def get_my_attendance(request: Request, session: AsyncSession):
        await validating_student_role(request)
        user_code = _user_from_request(request).get("user_code")

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        user = user_r.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")

        q = select(Attendance).where(Attendance.user_id == user.user_id)
        result = await session.execute(q)
        records = result.scalars().all()

        total = len(records)
        present = sum(1 for r in records if r.check_today)
        rate = round((present / total * 100), 1) if total else 0

        data = [
            {
                "attendance_id": r.attendance_id,
                "date": str(r.attendance_date),
                "status": "Present" if r.check_today else "Absent"
            }
            for r in records
        ]
        return JSONResponse({
            "success": True,
            "data": {
                "records": data,
                "summary": {"total": total, "present": present, "attendance_rate": rate}
            },
            "error": None
        })

    async def get_my_grades(request: Request, session: AsyncSession):
        await validating_student_role(request)
        user_code = _user_from_request(request).get("user_code")

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        user = user_r.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")

        q = (
            select(Grade, Course)
            .join(Course, Grade.course_id == Course.course_id)
            .where(Grade.user_id == user.user_id)
        )
        result = await session.execute(q)
        rows = result.all()

        data = [
            {
                "grade_id": g.grade_id,
                "grade": g.grade,
                "grade_point": g.grade_point,
                "course": {"course_code": c.course_code, "course_name": c.course_name}
            }
            for g, c in rows
        ]
        return JSONResponse({"success": True, "data": data, "error": None})

    async def get_my_timetable(request: Request, session: AsyncSession):
        await validating_student_role(request)
        user_code = _user_from_request(request).get("user_code")

        user_q = select(User).where(User.user_code == user_code)
        user_r = await session.execute(user_q)
        user = user_r.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")

        # Get enrolled course IDs
        enroll_q = select(Enrollment.course_id).where(Enrollment.student_id == user.user_id)
        enroll_r = await session.execute(enroll_q)
        course_ids = [row[0] for row in enroll_r.all()]

        if not course_ids:
            return JSONResponse({"success": True, "data": [], "error": None})

        tt_q = (
            select(TimeTable, Course)
            .join(Course, TimeTable.course_id == Course.course_id)
            .where(TimeTable.course_id.in_(course_ids))
        )
        tt_r = await session.execute(tt_q)
        rows = tt_r.all()

        data = [
            {
                "timetable_id": t.timetable_id,
                "day": t.day_of_week,
                "start_time": t.start_time,
                "end_time": t.end_time,
                "course": {"course_code": c.course_code, "course_name": c.course_name}
            }
            for t, c in rows
        ]
        return JSONResponse({"success": True, "data": data, "error": None})


# ═══════════════════════════════════════════════════════════════════════════════
# Parent Portal Service
# ═══════════════════════════════════════════════════════════════════════════════

class ParentPortalService:

    async def _resolve_parent(request: Request, session: AsyncSession) -> User:
        await validating_parent_role(request)
        user_code = _user_from_request(request).get("user_code")
        q = select(User).where(User.user_code == user_code)
        r = await session.execute(q)
        parent = r.scalars().first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent not found")
        return parent

    async def get_children(request: Request, session: AsyncSession):
        parent = await ParentPortalService._resolve_parent(request, session)
        q = (
            select(ParentStudent, User)
            .join(User, ParentStudent.student_id == User.user_id)
            .where(ParentStudent.parent_id == parent.user_id)
        )
        r = await session.execute(q)
        rows = r.all()
        data = [
            {
                "student_code": u.user_code,
                "username": u.username,
                "email": u.email,
                "relationship": ps.relationship_label
            }
            for ps, u in rows
        ]
        return JSONResponse({"success": True, "data": data, "error": None})

    async def get_child_attendance(student_code: str, request: Request, session: AsyncSession):
        parent = await ParentPortalService._resolve_parent(request, session)

        # Verify link
        link_q = (
            select(ParentStudent)
            .join(User, ParentStudent.student_id == User.user_id)
            .where(and_(ParentStudent.parent_id == parent.user_id, User.user_code == student_code))
        )
        link_r = await session.execute(link_q)
        if not link_r.scalars().first():
            raise HTTPException(status_code=403, detail="Not your child")

        student_q = select(User).where(User.user_code == student_code)
        student_r = await session.execute(student_q)
        student = student_r.scalars().first()

        q = select(Attendance).where(Attendance.user_id == student.user_id)
        r = await session.execute(q)
        records = r.scalars().all()

        data = [
            {"date": str(rec.attendance_date), "status": "Present" if rec.check_today else "Absent"}
            for rec in records
        ]
        return JSONResponse({"success": True, "data": data, "error": None})

    async def get_child_grades(student_code: str, request: Request, session: AsyncSession):
        parent = await ParentPortalService._resolve_parent(request, session)

        link_q = (
            select(ParentStudent)
            .join(User, ParentStudent.student_id == User.user_id)
            .where(and_(ParentStudent.parent_id == parent.user_id, User.user_code == student_code))
        )
        link_r = await session.execute(link_q)
        if not link_r.scalars().first():
            raise HTTPException(status_code=403, detail="Not your child")

        student_q = select(User).where(User.user_code == student_code)
        student_r = await session.execute(student_q)
        student = student_r.scalars().first()

        q = (
            select(Grade, Course)
            .join(Course, Grade.course_id == Course.course_id)
            .where(Grade.user_id == student.user_id)
        )
        r = await session.execute(q)
        rows = r.all()

        data = [
            {
                "grade": g.grade,
                "grade_point": g.grade_point,
                "course": {"course_code": c.course_code, "course_name": c.course_name}
            }
            for g, c in rows
        ]
        return JSONResponse({"success": True, "data": data, "error": None})
