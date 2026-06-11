from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.model import User, Enrollment, Course, Grade, TimeTable, Attendance, ParentStudent, Payment
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
                "enrollment_date": f"{e.enrollment_date.isoformat()}Z" if e.enrollment_date else None,
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

    async def get_child_attendance(student_code: str, request: Request, session: AsyncSession, page: int = 1, limit: int = 10):
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
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Total count for pagination
        count_q = select(func.count(Attendance.attendance_id)).where(Attendance.user_id == student.user_id)
        count_r = await session.execute(count_q)
        total_count = count_r.scalar() or 0

        # Overall summary
        present_q = select(func.count(Attendance.attendance_id)).where(and_(Attendance.user_id == student.user_id, Attendance.check_today == True))
        present_r = await session.execute(present_q)
        present_count = present_r.scalar() or 0
        rate = round((present_count / total_count * 100), 1) if total_count else 0

        # Paginated query
        q = (
            select(Attendance, Course)
            .outerjoin(Course, Attendance.course_id == Course.course_id)
            .where(Attendance.user_id == student.user_id)
            .order_by(Attendance.attendance_date.desc(), Attendance.attendance_id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        r = await session.execute(q)
        rows = r.all()

        data = [
            {
                "attendance_id": rec.attendance_id,
                "date": str(rec.attendance_date),
                "status": "Present" if rec.check_today else "Absent",
                "course_name": course.course_name if course else "General",
                "slot": rec.slot
            }
            for rec, course in rows
        ]
        
        return JSONResponse({
            "success": True,
            "data": {
                "records": data,
                "summary": {
                    "total": total_count,
                    "present": present_count,
                    "rate": rate
                },
                "pagination": {
                    "total_count": total_count,
                    "total_pages": (total_count + limit - 1) // limit,
                    "current_page": page,
                    "limit": limit
                }
            },
            "error": None
        })

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

    async def get_child_payments(student_code: str, request: Request, session: AsyncSession):
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
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Let's get enrollments and their courses
        enroll_q = (
            select(Enrollment, Course)
            .join(Course, Enrollment.course_id == Course.course_id)
            .where(Enrollment.student_id == student.user_id)
        )
        enroll_r = await session.execute(enroll_q)
        enrollment_rows = enroll_r.all()

        data = []
        for e, c in enrollment_rows:
            # Get payments for this enrollment
            pay_q = select(Payment).where(Payment.enrollment_id == e.enrollment_id)
            pay_r = await session.execute(pay_q)
            payments = pay_r.scalars().all()

            # Calculate total paid
            total_paid = sum((p.amount or 0) + (p.amount_2 or 0) for p in payments)
            total_discount = sum(p.discount_amount or 0 for p in payments)
            
            # Calculate total cost
            total_cost = float(e.total_fee if e.total_fee is not None else (c.fee_full_payment if e.payment_plan == "full" else c.fee_installment) or 0.0)
            
            # Remaining balance
            remaining_balance = max(0.0, total_cost - (total_paid + total_discount))

            # How many payments left
            payments_left = 0
            if remaining_balance > 0:
                if e.payment_plan == "full":
                    payments_left = 1
                else:  # installment
                    inst_amount = e.installment_amount or c.fee_installment or 0.0
                    if inst_amount > 0:
                        import math
                        payments_left = math.ceil(remaining_balance / inst_amount)
                    else:
                        payments_left = 1
            
            # Calculate exam fee details
            exam_fee_total_gbp = float(e.exam_fee_gbp if e.exam_fee_gbp is not None else c.exam_fee_gbp or 0.0)
            exam_fee_paid_gbp = sum(p.exam_fee_paid_gbp or 0.0 for p in payments)
            exam_fee_paid_mmk = sum(p.exam_fee_paid_mmk or 0.0 for p in payments)
            
            payments_data = []
            for p in payments:
                payments_data.append({
                    "payment_id": p.payment_id,
                    "receipt_id": getattr(p, "receipt_id", None) or "N/A",
                    "amount": p.amount,
                    "payment_date": f"{p.payment_date.isoformat()}Z" if p.payment_date else None,
                    "month": p.month,
                    "status": p.status,
                    "payment_method": p.payment_method,
                    "amount_2": p.amount_2 or 0.0,
                    "payment_method_2": p.payment_method_2,
                    "fine_amount": p.fine_amount or 0.0,
                    "fine_reason": p.fine_reason,
                    "extra_items_fee": p.extra_items_fee or 0.0,
                    "extra_items": p.extra_items,
                    "exam_fee_paid_gbp": p.exam_fee_paid_gbp or 0.0,
                    "exam_fee_paid_mmk": p.exam_fee_paid_mmk or 0.0,
                    "exam_fee_currency": p.exam_fee_currency or "MMK",
                    "discount_amount": p.discount_amount or 0.0
                })

            data.append({
                "enrollment_code": e.enrollment_code,
                "course_name": c.course_name,
                "course_code": c.course_code,
                "payment_plan": e.payment_plan or "full",
                "total_fee": total_cost,
                "total_paid": total_paid,
                "total_discount": total_discount,
                "remaining_balance": remaining_balance,
                "installment_amount": e.installment_amount or 0.0,
                "payments_left": payments_left,
                "status": "Paid" if remaining_balance <= 0 else "Pending",
                "exam_fee_total_gbp": exam_fee_total_gbp,
                "exam_fee_paid_gbp": exam_fee_paid_gbp,
                "exam_fee_paid_mmk": exam_fee_paid_mmk,
                "payments": payments_data
            })

        return JSONResponse({"success": True, "data": data, "error": None})

