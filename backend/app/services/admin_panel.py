from app.services.rbac_portal import validating_admin_role, validating_parent_role
from app.models.model import User, AcademicYear, Attendance, Course, Enrollment, Grade, ParentStudent, StaffAttendance, Room, TimeTable, Payment, ActivityLog
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.academic_year import AdminAcademicYearCreate, AdminAcademicYearUpdate
from app.schemas.attendance import AttendanceMarkRequest, AttendanceUpdateRequest
from sqlalchemy import and_, select, update, delete
from fastapi.responses import JSONResponse
from fastapi import Request
from app.schemas.user import UserUpdate, AdminStudentCreate, AdminParentCreate, AdminParentLinkChild, AdminStaffCreate
from datetime import datetime, date, time
from app.security.password_hashing import hash_password
from sqlalchemy import func
from app.schemas.course import AdminCourseCreate, AdminCourseUpdate
from app.schemas.enrollment import AdminEnrollmentCreate, AdminEnrollmentUpdate
from app.schemas.room import AdminRoomCreate, AdminRoomUpdate
from collections import defaultdict
from app.schemas.time_table import AdminTimeTableCreate, AdminTimeTableUpdate
from app.schemas.payment import PaymentCreate, PaymentUpdate


def _serialize_user(u: User) -> dict:
    return {
        "user_id": u.user_id,
        "user_code": u.user_code,
        "username": u.username,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
        "nrc": getattr(u, "nrc", None),
        "phone": getattr(u, "phone", None),
        "parent_name": getattr(u, "parent_name", None),
        "parent_phone": getattr(u, "parent_phone", None),
        "address": getattr(u, "address", None),
        "profile_picture": getattr(u, "profile_picture", None),
        "data_of_birth": u.data_of_birth.isoformat() if getattr(u, "data_of_birth", None) else None,
        "created_at": u.created_at.isoformat() if getattr(u, "created_at", None) else None,
        "updated_at": u.updated_at.isoformat() if getattr(u, "updated_at", None) else None,
    }


async def _next_student_code(session: AsyncSession, department: str = "College") -> str:
    """
    Generate a student_code like CO001226 or IN001226 based on department.
    """
    prefix = "IN" if department == "Institute" else "CO"
    
    # Get all student codes for this prefix to find the max sequence number
    result = await session.execute(
        select(User.user_code)
        .where(and_(User.role == "student", User.user_code.like(f"{prefix}%")))
    )
    codes = result.scalars().all()
    
    max_seq = 0
    for code in codes:
        if code and len(code) >= 5:
            try:
                # The sequence is always the 3 digits after the 2-character prefix
                seq_val = int(code[2:5])
                if seq_val > max_seq:
                    max_seq = seq_val
            except ValueError:
                pass
                
    seq = max_seq + 1
    
    now = datetime.now()
    month_str = str(now.month)
    year_str = str(now.year)[-2:]
    
    return f"{prefix}{seq:03d}{month_str}{year_str}"

async def _next_parent_code(session: AsyncSession) -> str:
    """
    Generate a stable parent_code like PAR0001.
    """
    result = await session.execute(
        select(User.user_code)
        .where(and_(User.role == "parent", User.user_code.like("PAR%")))
    )
    codes = result.scalars().all()
    
    max_seq = 0
    for code in codes:
        if code and len(code) >= 7:
            try:
                # PAR prefix is 3 chars, seq is after that
                seq_val = int(code[3:])
                if seq_val > max_seq:
                    max_seq = seq_val
            except ValueError:
                pass
                
    return f"PAR{max_seq + 1:04d}"

async def _next_staff_code(session: AsyncSession, role: str) -> str:
    """
    Generate stable code like SAL0001 (sales), TCH0001 (teacher).
    """
    prefix_map = {
        "sales": "SAL",
        "teacher": "TCH",
        "hr": "HRX",
        "manager": "MGR"
    }
    prefix = prefix_map.get(role, "STF")
    result = await session.execute(
        select(User.user_code)
        .where(and_(User.role == role, User.user_code.like(f"{prefix}%")))
    )
    codes = result.scalars().all()
    
    max_seq = 0
    for code in codes:
        if code and len(code) >= len(prefix) + 4:
            try:
                seq_val = int(code[len(prefix):])
                if seq_val > max_seq:
                    max_seq = seq_val
            except ValueError:
                pass
                
    return f"{prefix}{max_seq + 1:04d}"


async def _next_course_code(session: AsyncSession) -> str:
    result = await session.execute(select(Course.course_id).order_by(Course.course_id.desc()).limit(1))
    last_id = result.scalar_one_or_none() or 0
    return f"CRS{last_id + 1:04d}"


async def _next_enrollment_code(session: AsyncSession) -> str:
    result = await session.execute(select(Enrollment.enrollment_id).order_by(Enrollment.enrollment_id.desc()).limit(1))
    last_id = result.scalar_one_or_none() or 0
    return f"ENR{last_id + 1:04d}"


def _serialize_academic_year(y: AcademicYear) -> dict:
    return {
        "academic_year_id": y.academic_year_id,
        "academic_year_name": y.year_name,
        "start_date": y.start_date.date().isoformat() if getattr(y, "start_date", None) else None,
        "end_date": y.end_date.date().isoformat() if getattr(y, "end_date", None) else None,
    }


def _serialize_course(c: Course) -> dict:
    return {
        "course_id": c.course_id,
        "course_code": c.course_code,
        "course_name": c.course_name,
        "academic_year_id": c.academicyear_id,
        "instructor_id": c.instructor_id,
        "start_date": str(c.start_date) if getattr(c, "start_date", None) else None,
        "end_date": str(c.end_date) if getattr(c, "end_date", None) else None,
        "room": c.room,
        "fee_full_payment": getattr(c, "fee_full_payment", None),
        "fee_installment": getattr(c, "fee_installment", None),
        "exam_fee_gbp": getattr(c, "exam_fee_gbp", None),
        "foc_items": getattr(c, "foc_items", None),
        "discount_plan": getattr(c, "discount_plan", None),
    }


def _serialize_enrollment(e: Enrollment) -> dict:
    return {
        "enrollment_id": e.enrollment_id,
        "enrollment_code": e.enrollment_code,
        "student_id": e.student_id,
        "course_id": e.course_id,
        "enrollment_date": str(e.enrollment_date) if getattr(e, "enrollment_date", None) else None,
        "status": bool(e.status),
        "batch_no": getattr(e, "batch_no", None),
        "payment_plan": getattr(e, "payment_plan", None),
        "downpayment": getattr(e, "downpayment", None),
        "installment_amount": getattr(e, "installment_amount", None),
    }


def _serialize_room(r: Room) -> dict:
    return {
        "room_id": r.room_id,
        "room_name": r.room_name,
        "capacity": r.capacity,
        "is_active": r.is_active,
        "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None,
        "updated_at": r.updated_at.isoformat() if getattr(r, "updated_at", None) else None,
    }


async def _log_activity(request: Request, session: AsyncSession, action: str, details: str):
    from app.services.rbac_portal import _get_user
    try:
        user_info = _get_user(request)
        user_id = user_info.get("user_id")
        # JWT doesn't contain user_id, so look it up from user_code
        if not user_id and user_info.get("user_code"):
            from app.models.model import User as UserModel
            result = await session.execute(
                select(UserModel.user_id).where(UserModel.user_code == user_info["user_code"])
            )
            row = result.scalar_one_or_none()
            if row:
                user_id = row
        if user_id:
            al = ActivityLog(
                user_id=user_id,
                action=action,
                details=details
            )
            session.add(al)
            await session.commit()
    except Exception as e:
        print("_log_activity error:", e)

class AdminPanelService:

    async def get_activity_logs(request: Request, session: AsyncSession):
        if not await validating_admin_role(request):
            return {"message": "You are not authorized to perform this action"}
            
        from sqlalchemy.orm import joinedload
        query = select(ActivityLog).options(joinedload(ActivityLog.user)).order_by(ActivityLog.timestamp.desc())
        result = await session.execute(query)
        logs = result.scalars().all()
        
        data = []
        for log in logs:
            data.append({
                "log_id": log.log_id,
                "user_id": log.user_id,
                "username": log.user.username if log.user else "Unknown",
                "role": log.user.role if log.user else "Unknown",
                "action": log.action,
                "details": log.details,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None
            })
            
        return JSONResponse({"status_code": 200, "message": "Activity logs fetched", "data": data})


    
    async def get_all_users(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
            
        result = await session.execute(select(User))
        users = result.scalars().all()
        return JSONResponse(
            {
                "status_code": 200,
                "message": "All users fetched successfully",
                "data": [_serialize_user(u) for u in users],
            }
        )

    async def get_students_details(request: Request , session:AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        
        query = select(User).where(User.role == "student")
        result = await session.execute(query)
        students = result.scalars().all()
        return JSONResponse(
            {
                "status_code": 200,
                "message": "Students details fetched successfully",
                "data": [_serialize_user(s) for s in students],
            }
        )

    async def create_student(payload: AdminStudentCreate, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        # Email uniqueness
        existing = await session.execute(select(User).where(User.email == payload.email))
        if existing.scalars().first():
            return JSONResponse({"status_code": 409, "message": "Email already exists"}, status_code=409)

        if payload.user_code and payload.user_code.strip():
            user_code = payload.user_code.strip()
            # Verify uniqueness of user_code
            existing_code = await session.execute(select(User).where(User.user_code == user_code))
            if existing_code.scalars().first():
                return JSONResponse({"status_code": 409, "message": "Student code already exists"}, status_code=409)
        else:
            user_code = await _next_student_code(session, getattr(payload, "department", "College"))
            
        hashed = await hash_password(payload.password)

        dob_dt = datetime.combine(payload.date_of_birth, time.min)
        new_user = User(
            user_code=user_code,
            username=payload.username,
            email=payload.email,
            password_hash=hashed,
            data_of_birth=dob_dt,
            role="student",
            nrc=payload.nrc,
            phone=payload.phone,
            parent_name=payload.parent_name,
            parent_phone=payload.parent_phone,
            address=payload.address,
            profile_picture=payload.profile_picture,
            is_active=payload.is_active if payload.is_active is not None else True,
        )
        session.add(new_user)
        await session.flush()
        await _log_activity(request, session, "Create Student", f"Student {user_code} created")
        
        # Auto-enroll if course is given
        if payload.course_code:
            c_r = await session.execute(select(Course).where(Course.course_code == payload.course_code))
            course_obj = c_r.scalars().first()
            if course_obj:
                e_code = await _next_enrollment_code(session)
                enroll = Enrollment(
                    enrollment_code=e_code,
                    student_id=new_user.user_id,
                    course_id=course_obj.course_id,
                    status=True,
                    batch_no=payload.batch_no,
                    payment_plan=payload.payment_plan,
                    downpayment=payload.downpayment,
                    installment_amount=payload.installment_amount
                )
                session.add(enroll)

        await session.commit()
        await session.refresh(new_user)
        return JSONResponse(
            {
                "status_code": 201,
                "message": "Student created successfully",
                "data": _serialize_user(new_user),
            },
            status_code=201,
        )
    
    async def get_specific_student(user_code: str ,request: Request , session:AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        
        query = select(User).where(and_(User.user_code == user_code , User.role == "student"))
        result = await session.execute(query)
        student = result.scalars().first()
        if not student:
            return JSONResponse({"status_code": 404, "message": "Student not found"}, status_code=404)
        return JSONResponse(
            {
                "status_code": 200,
                "message": "Student details fetched successfully",
                "data": _serialize_user(student),
            }
        )

    async def get_student_relations(user_code: str, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(select(User).where(and_(User.user_code == user_code, User.role == "student")))
        student = r.scalars().first()
        if not student:
            return JSONResponse({"status_code": 404, "message": "Student not found"}, status_code=404)

        enroll_r = await session.execute(
            select(Enrollment, Course)
            .join(Course, Enrollment.course_id == Course.course_id)
            .where(Enrollment.student_id == student.user_id)
        )
        enrollment_rows = enroll_r.all()
        enrollments = [e for e, c in enrollment_rows]

        att_r = await session.execute(select(Attendance).where(Attendance.user_id == student.user_id))
        attendance = att_r.scalars().all()

        parents_r = await session.execute(
            select(ParentStudent, User)
            .join(User, ParentStudent.parent_id == User.user_id)
            .where(ParentStudent.student_id == student.user_id)
        )
        parent_rows = parents_r.all()

        enroll_ids = [e.enrollment_id for e in enrollments]
        payments = []
        if enroll_ids:
            pay_r = await session.execute(
                select(Payment, Enrollment, Course)
                .join(Enrollment, Payment.enrollment_id == Enrollment.enrollment_id)
                .join(Course, Course.course_id == Enrollment.course_id)
                .where(Enrollment.enrollment_id.in_(enroll_ids))
            )
            for p, e, c in pay_r.all():
                payments.append({
                    "payment_id": p.payment_id,
                    "enrollment_id": p.enrollment_id,
                    "enrollment_code": e.enrollment_code,
                    "amount": p.amount,
                    "payment_date": str(p.payment_date),
                    "month": p.month,
                    "status": p.status,
                    "payment_method": getattr(p, "payment_method", None),
                    "course_name": c.course_name,
                    "course_code": c.course_code,
                    "course_cost": c.fee_full_payment if getattr(e, "payment_plan", None) == "full" else (c.fee_installment if getattr(e, "payment_plan", None) == "installment" else 0),
                    "foc_items": getattr(c, "foc_items", None),
                    "payment_plan": getattr(e, "payment_plan", None),
                    "downpayment": getattr(e, "downpayment", 0) or 0,
                    "installment_amount": getattr(e, "installment_amount", 0) or 0,
                    "fine_amount": getattr(p, "fine_amount", 0) or 0,
                    "extra_items_fee": getattr(p, "extra_items_fee", 0) or 0,
                    "extra_items": getattr(p, "extra_items", None),
                    "fine_reason": getattr(p, "fine_reason", None),
                    "exam_fee_paid_gbp": getattr(p, "exam_fee_paid_gbp", 0) or 0,
                    "exam_fee_paid_mmk": getattr(p, "exam_fee_paid_mmk", 0) or 0,
                    "exam_fee_currency": getattr(p, "exam_fee_currency", "MMK")
                })

        return JSONResponse(
            {
                "status_code": 200,
                "message": "Student relations fetched successfully",
                "data": {
                    "student": _serialize_user(student),
                    "enrollments": [
                        {
                            **_serialize_enrollment(e),
                            "course_code": c.course_code,
                            "course_name": c.course_name,
                            "course_cost": c.fee_full_payment if getattr(e, "payment_plan", None) == "full" else (c.fee_installment if getattr(e, "payment_plan", None) == "installment" else 0),
                            "foc_items": getattr(c, "foc_items", None)
                        }
                        for e, c in enrollment_rows
                    ],
                    "attendance": [
                        {
                            "attendance_id": a.attendance_id,
                            "attendance_date": str(a.attendance_date),
                            "check_today": a.check_today,
                        }
                        for a in attendance
                    ],
                    "parents": [
                        {
                            "parent_code": p.user_code,
                            "parent_name": p.username,
                            "parent_email": p.email,
                            "relationship": ps.relationship_label,
                        }
                        for ps, p in parent_rows
                    ],
                    "payments": payments,
                },
            }
        )
    
    async def get_teachers_details(request: Request , session:AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        
        query = select(User).where(User.role == "teacher")
        result = await session.execute(query)
        teachers = result.scalars().all()
        response = JSONResponse({
            "status_code": 200,
            "message": "Teachers details fetched successfully",
            "data": [_serialize_user(t) for t in teachers]
        })
        return response
    
    async def get_specific_teacher(user_code: str ,request: Request , session:AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        
        query = select(User).where(and_(User.user_code == user_code , User.role == "teacher"))
        result = await session.execute(query)
        teachers = result.scalars().all()
        response = JSONResponse({
            "status_code": 200,
            "message": "Teacher details fetched successfully",
            "data": [_serialize_user(t) for t in teachers]
        })
        return response
    
    async def get_parents_details(request: Request , session:AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        
        query = select(User).where(User.role == "parent")
        result = await session.execute(query)
        parents = result.scalars().all()
        response = JSONResponse({
            "status_code": 200,
            "message": "Parents details fetched successfully",
            "data": [_serialize_user(p) for p in parents]
        })
        return response
    
    async def get_specific_parent(user_code: str ,request: Request , session:AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        
        query = select(User).where(and_(User.user_code == user_code , User.role == "parent"))
        result = await session.execute(query)
        parent = result.scalars().first()
        if not parent:
            return JSONResponse({"status_code": 404, "message": "Parent not found"}, status_code=404)
        return JSONResponse({"status_code": 200, "message": "Parent details fetched successfully", "data": _serialize_user(parent)})

    async def create_parent(payload: AdminParentCreate, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        existing = await session.execute(select(User).where(User.email == payload.email))
        if existing.scalars().first():
            return JSONResponse({"status_code": 409, "message": "Email already exists"}, status_code=409)

        user_code = await _next_parent_code(session)
        hashed = await hash_password(payload.password)
        dob_dt = datetime.combine(payload.date_of_birth, time.min)

        new_user = User(
            user_code=user_code,
            username=payload.username,
            email=payload.email,
            password_hash=hashed,
            data_of_birth=dob_dt,
            role="parent",
            is_active=payload.is_active if payload.is_active is not None else True,
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        await _log_activity(request, session, "Create Parent", f"Parent {user_code} ({payload.username}) created")
        return JSONResponse(
            {"status_code": 201, "message": "Parent created successfully", "data": _serialize_user(new_user)},
            status_code=201,
        )

    async def create_staff(payload: AdminStaffCreate, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=False):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to create staff accounts"}, status_code=403)

        existing = await session.execute(select(User).where(User.email == payload.email))
        if existing.scalars().first():
            return JSONResponse({"status_code": 409, "message": "Email already exists"}, status_code=409)

        user_code = await _next_staff_code(session, payload.role)
        hashed = await hash_password(payload.password)
        dob_dt = datetime.combine(payload.date_of_birth, time.min)

        new_user = User(
            user_code=user_code,
            username=payload.username,
            email=payload.email,
            password_hash=hashed,
            data_of_birth=dob_dt,
            role=payload.role,
            is_active=payload.is_active if payload.is_active is not None else True,
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        # Log the activity
        await _log_activity(
            request, 
            session, 
            action="Create Staff", 
            details=f"Created {payload.role} account '{payload.username}' ({user_code})"
        )
        
        return JSONResponse(
            {"status_code": 201, "message": "Staff created successfully", "data": _serialize_user(new_user)},
            status_code=201,
        )

    async def link_parent_child(parent_code: str, payload: AdminParentLinkChild, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        pr = await session.execute(select(User).where(and_(User.user_code == parent_code, User.role == "parent")))
        parent = pr.scalars().first()
        if not parent:
            return JSONResponse({"status_code": 404, "message": "Parent not found"}, status_code=404)

        sr = await session.execute(select(User).where(and_(User.user_code == payload.student_code, User.role == "student")))
        student = sr.scalars().first()
        if not student:
            return JSONResponse({"status_code": 404, "message": "Student not found"}, status_code=404)

        dup = await session.execute(
            select(ParentStudent).where(and_(ParentStudent.parent_id == parent.user_id, ParentStudent.student_id == student.user_id))
        )
        link = dup.scalars().first()
        if link:
            # allow relationship label updates
            link.relationship_label = payload.relationship_label or link.relationship_label
            await session.commit()
            await _log_activity(request, session, "Update Parent Link", f"Parent {parent_code} linked to {payload.student_code} - relationship updated")
            return JSONResponse({"status_code": 200, "message": "Parent already linked to student; relationship updated"})

        session.add(
            ParentStudent(
                parent_id=parent.user_id,
                student_id=student.user_id,
                relationship_label=payload.relationship_label or "parent",
            )
        )
        await session.commit()
        await _log_activity(request, session, "Link Parent-Student", f"Parent {parent_code} linked to student {payload.student_code}")
        return JSONResponse({"status_code": 201, "message": "Parent linked to student successfully"}, status_code=201)
    
    async def update_user(user_code: str, user_update: UserUpdate, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
            
        query = select(User).where(User.user_code == user_code)
        result = await session.execute(query)
        user = result.scalars().first()
        
        if not user:
            return JSONResponse({"message": "User not found"}, status_code=404)
            
        update_data = user_update.dict(exclude_unset=True)
        # Schema uses date_of_birth; model uses data_of_birth
        if "date_of_birth" in update_data:
            user.data_of_birth = update_data.pop("date_of_birth")
        # phone isn't in the model; ignore it safely
        update_data.pop("phone", None)
        for key, value in update_data.items():
            setattr(user, key, value)
            
        await session.commit()
        await _log_activity(request, session, "Update User", f"User {user_code} updated")
        return JSONResponse({"status_code": 200, "message": "User updated successfully"})
        
    async def delete_user(user_code: str, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
            
        query = select(User).where(User.user_code == user_code)
        result = await session.execute(query)
        user = result.scalars().first()
        
        if not user:
            return JSONResponse({"message": "User not found"}, status_code=404)

        # Defensive cleanup: some FKs (e.g. Attendance.user_id) don't specify ondelete="CASCADE",
        # and ORM cascades won't always trigger unless relationships are loaded.
        # So we explicitly delete dependent records first.
        uid = user.user_id

        # Detach instructor courses (if deleting a teacher/staff)
        await session.execute(update(Course).where(Course.instructor_id == uid).values(instructor_id=None))

        # Remove links/child records
        await session.execute(delete(ParentStudent).where(ParentStudent.parent_id == uid))
        await session.execute(delete(ParentStudent).where(ParentStudent.student_id == uid))
        await session.execute(delete(Enrollment).where(Enrollment.student_id == uid))
        await session.execute(delete(Grade).where(Grade.user_id == uid))
        await session.execute(delete(Attendance).where(Attendance.user_id == uid))
        await session.execute(delete(StaffAttendance).where(StaffAttendance.user_id == uid))

        await session.delete(user)
        await session.commit()
        await _log_activity(request, session, "Delete User", f"User {user_code} deleted")
        return JSONResponse({"status_code": 200, "message": "User deleted successfully"})

    async def seed_sample_data(request: Request, session: AsyncSession):
        """Create a small set of sample records for quickly testing admin CRUD."""
        if not await validating_admin_role(request):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        created = {"academic_years": 0, "teachers": 0, "courses": 0, "students": 0, "enrollments": 0, "attendance": 0}

        # Academic year
        year_name = f"{date.today().year}/{date.today().year + 1}"
        yr_r = await session.execute(select(AcademicYear).where(AcademicYear.year_name == year_name))
        year = yr_r.scalars().first()
        if not year:
            year = AcademicYear(
                year_name=year_name,
                start_date=datetime(date.today().year, 1, 1),
                end_date=datetime(date.today().year, 12, 31),
            )
            session.add(year)
            await session.flush()
            created["academic_years"] += 1

        # Teacher (instructor)
        teacher_email = "teacher.sample@nit.local"
        t_r = await session.execute(select(User).where(User.email == teacher_email))
        teacher = t_r.scalars().first()
        if not teacher:
            teacher = User(
                user_code=f"TEA{(await session.execute(select(func.coalesce(func.max(User.user_id), 0)))).scalar_one() + 1:04d}",
                username="Sample Teacher",
                email=teacher_email,
                password_hash=await hash_password("teacher123"),
                data_of_birth=datetime(1990, 1, 1),
                role="teacher",
                is_active=True,
            )
            session.add(teacher)
            await session.flush()
            created["teachers"] += 1

        # Courses
        course_names = ["Web Development", "UI/UX Design", "Cyber Security"]
        courses = []
        for name in course_names:
            c_r = await session.execute(select(Course).where(Course.course_name == name))
            c = c_r.scalars().first()
            if not c:
                c = Course(
                    course_code=await _next_course_code(session),
                    course_name=name,
                    academicyear_id=year.academic_year_id,
                    instructor_id=teacher.user_id,
                    start_date=date.today(),
                    end_date=date.today().replace(month=12, day=31),
                    room="Room 1",
                )
                session.add(c)
                await session.flush()
                created["courses"] += 1
            courses.append(c)

        # Students
        student_emails = ["student1.sample@nit.local", "student2.sample@nit.local", "student3.sample@nit.local"]
        students = []
        for i, email in enumerate(student_emails, start=1):
            s_r = await session.execute(select(User).where(User.email == email))
            s = s_r.scalars().first()
            if not s:
                s = User(
                    user_code=await _next_student_code(session),
                    username=f"Sample Student {i}",
                    email=email,
                    password_hash=await hash_password("student123"),
                    data_of_birth=datetime(2006, 1, 1),
                    role="student",
                    is_active=True,
                )
                session.add(s)
                await session.flush()
                created["students"] += 1
            students.append(s)

        # Enrollments + today's attendance
        for s in students:
            for i, c in enumerate(courses):
                if i >= 2: break
                dup = await session.execute(select(Enrollment).where(and_(Enrollment.student_id == s.user_id, Enrollment.course_id == c.course_id)))
                if not dup.scalars().first():
                    e = Enrollment(enrollment_code=await _next_enrollment_code(session), student_id=s.user_id, course_id=c.course_id, status=True)
                    session.add(e)
                    created["enrollments"] += 1

            att_dup = await session.execute(select(Attendance).where(and_(Attendance.user_id == s.user_id, Attendance.attendance_date == date.today())))
            if not att_dup.scalars().first():
                session.add(Attendance(user_id=s.user_id, attendance_date=date.today(), check_today=True))
                created["attendance"] += 1

        await session.commit()
        return JSONResponse({"status_code": 200, "message": "Sample data seeded", "data": created})

    async def purge_all_data_except_admin(request: Request, session: AsyncSession):
        if not await validating_admin_role(request):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        # Delete domain data first, then non-admin users.
        await session.execute(delete(ParentStudent))
        await session.execute(delete(Enrollment))
        await session.execute(delete(Grade))
        await session.execute(delete(Attendance))
        await session.execute(delete(StaffAttendance))
        await session.execute(delete(TimeTable))
        await session.execute(delete(Course))
        await session.execute(delete(AcademicYear))
        await session.execute(delete(Room))
        await session.execute(delete(User).where(User.role != "admin"))

        await session.commit()
        return JSONResponse({"status_code": 200, "message": "Purged all data except admin accounts"})
        
    async def get_all_users(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
            
        query = select(User)
        result = await session.execute(query)
        users = result.scalars().all()
        return {"status_code": 200, "message": "All users fetched", "data": users}

    # CRUD - Academic Year

    async def create_academic_year(request: Request, session: AsyncSession, payload: AdminAcademicYearCreate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        existing = await session.execute(select(AcademicYear).where(AcademicYear.year_name == payload.academic_year_name))
        if existing.scalars().first():
            return JSONResponse({"status_code": 409, "message": "Academic year already exists"}, status_code=409)

        new_academic_year = AcademicYear(
            year_name=payload.academic_year_name,
            start_date=datetime.strptime(payload.start_date, "%Y-%m-%d"),
            end_date=datetime.strptime(payload.end_date, "%Y-%m-%d"),
        )
        session.add(new_academic_year)
        await session.commit()
        await session.refresh(new_academic_year)
        await _log_activity(request, session, "Create Academic Year", f"Academic year '{payload.academic_year_name}' created")
        return JSONResponse({"status_code": 201, "message": "Academic year created successfully", "data": _serialize_academic_year(new_academic_year)}, status_code=201)
        
    async def get_all_academic_years(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        query = select(AcademicYear)
        result = await session.execute(query)
        years = result.scalars().all()
        return JSONResponse({"status_code": 200, "message": "Fetched all academic years", "data": [_serialize_academic_year(y) for y in years]})
        
    async def get_specific_academic_details(academic_year_id: int ,request: Request , session:AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
        
        query = select(AcademicYear).where(AcademicYear.academic_year_id == academic_year_id)
        result = await session.execute(query)
        academic_year = result.scalars().first()
        if not academic_year:
            return JSONResponse({"message": "Academic year not found"}, status_code=404)
        return {"status_code": 200, "message": "Academic detail fetched successfully", "data": academic_year}
        
    async def update_academic_year(academic_year_id: int, request: Request, session: AsyncSession, payload: AdminAcademicYearUpdate):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
            
        query = select(AcademicYear).where(AcademicYear.academic_year_id == academic_year_id)
        result = await session.execute(query)
        target_year = result.scalars().first()
        
        if not target_year:
            return JSONResponse({"message": "Academic year not found"}, status_code=404)
            
        if payload.academic_year_name is not None:
            target_year.year_name = payload.academic_year_name
        if payload.start_date is not None:
            target_year.start_date = datetime.strptime(payload.start_date, "%Y-%m-%d")
        if payload.end_date is not None:
            target_year.end_date = datetime.strptime(payload.end_date, "%Y-%m-%d")
        
        await session.commit()
        await _log_activity(request, session, "Update Academic Year", f"Academic year ID {academic_year_id} updated")
        return JSONResponse({"status_code": 200, "message": "Academic year updated successfully", "data": _serialize_academic_year(target_year)})
        
    async def delete_academic_year(academic_year_id: int, request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return {"message": "You are not authorized to perform this action"}
            
        query = select(AcademicYear).where(AcademicYear.academic_year_id == academic_year_id)
        result = await session.execute(query)
        target_year = result.scalars().first()
        
        if not target_year:
            return JSONResponse({"message": "Academic year not found"}, status_code=404)
            
        await session.delete(target_year)
        await session.commit()
        await _log_activity(request, session, "Delete Academic Year", f"Academic year ID {academic_year_id} deleted")
        return JSONResponse({"status_code": 200, "message": "Academic year deleted successfully"})

    # CRUD - Courses

    async def list_courses(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)
        r = await session.execute(select(Course))
        courses = r.scalars().all()
        return JSONResponse({"status_code": 200, "message": "Courses fetched successfully", "data": [_serialize_course(c) for c in courses]})

    async def create_course(request: Request, session: AsyncSession, payload: AdminCourseCreate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        year = await session.execute(select(AcademicYear).where(AcademicYear.academic_year_id == payload.academic_year_id))
        if not year.scalars().first():
            return JSONResponse({"status_code": 404, "message": "Academic year not found"}, status_code=404)

        instructor_id = None
        if payload.instructor_user_code:
            u = await session.execute(select(User).where(User.user_code == payload.instructor_user_code))
            inst = u.scalars().first()
            if not inst:
                return JSONResponse({"status_code": 404, "message": "Instructor not found"}, status_code=404)
            instructor_id = inst.user_id

        course_code = await _next_course_code(session)
        new_course = Course(
            course_code=course_code,
            course_name=payload.course_name,
            academicyear_id=payload.academic_year_id,
            instructor_id=instructor_id,
            start_date=datetime.strptime(payload.start_date, "%Y-%m-%d").date() if payload.start_date else None,
            end_date=datetime.strptime(payload.end_date, "%Y-%m-%d").date() if getattr(payload, "end_date", None) else None,
            room=payload.room,
            fee_full_payment=payload.fee_full_payment,
            fee_installment=payload.fee_installment,
            exam_fee_gbp=payload.exam_fee_gbp,
            foc_items=payload.foc_items,
            discount_plan=payload.discount_plan,
        )
        session.add(new_course)
        await session.commit()
        await session.refresh(new_course)
        await _log_activity(request, session, "Create Course", f"Course {course_code} ({payload.course_name}) created")
        return JSONResponse({"status_code": 201, "message": "Course created successfully", "data": _serialize_course(new_course)}, status_code=201)

    async def update_course(request: Request, session: AsyncSession, course_code: str, payload: AdminCourseUpdate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)
        r = await session.execute(select(Course).where(Course.course_code == course_code))
        course = r.scalars().first()
        if not course:
            return JSONResponse({"status_code": 404, "message": "Course not found"}, status_code=404)

        if payload.course_name is not None:
            course.course_name = payload.course_name
        if payload.academic_year_id is not None:
            y = await session.execute(select(AcademicYear).where(AcademicYear.academic_year_id == payload.academic_year_id))
            if not y.scalars().first():
                return JSONResponse({"status_code": 404, "message": "Academic year not found"}, status_code=404)
            course.academicyear_id = payload.academic_year_id
        if payload.instructor_user_code is not None:
            if payload.instructor_user_code == "":
                course.instructor_id = None
            else:
                u = await session.execute(select(User).where(User.user_code == payload.instructor_user_code))
                inst = u.scalars().first()
                if not inst:
                    return JSONResponse({"status_code": 404, "message": "Instructor not found"}, status_code=404)
                course.instructor_id = inst.user_id
        if payload.start_date is not None:
            course.start_date = datetime.strptime(payload.start_date, "%Y-%m-%d").date() if payload.start_date else None
        if getattr(payload, "end_date", None) is not None:
            course.end_date = datetime.strptime(payload.end_date, "%Y-%m-%d").date() if payload.end_date else None
        if payload.room is not None:
            course.room = payload.room
        if getattr(payload, "fee_full_payment", None) is not None:
            course.fee_full_payment = payload.fee_full_payment
        if getattr(payload, "fee_installment", None) is not None:
            course.fee_installment = payload.fee_installment
        if getattr(payload, "exam_fee_gbp", None) is not None:
            course.exam_fee_gbp = payload.exam_fee_gbp
        if getattr(payload, "foc_items", None) is not None:
            course.foc_items = payload.foc_items
        if getattr(payload, "discount_plan", None) is not None:
            course.discount_plan = payload.discount_plan

        await session.commit()
        await _log_activity(request, session, "Update Course", f"Course {course_code} updated")
        return JSONResponse({"status_code": 200, "message": "Course updated successfully", "data": _serialize_course(course)})

    async def delete_course(request: Request, session: AsyncSession, course_code: str):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)
        r = await session.execute(select(Course).where(Course.course_code == course_code))
        course = r.scalars().first()
        if not course:
            return JSONResponse({"status_code": 404, "message": "Course not found"}, status_code=404)
        await session.delete(course)
        await session.commit()
        await _log_activity(request, session, "Delete Course", f"Course {course_code} deleted")
        return JSONResponse({"status_code": 200, "message": "Course deleted successfully"})

    # CRUD - Enrollments

    async def list_enrollments(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)
        r = await session.execute(
            select(Enrollment, User, Course)
            .join(User, Enrollment.student_id == User.user_id)
            .join(Course, Enrollment.course_id == Course.course_id)
        )
        rows = r.all()
        data = []
        for e, u, c in rows:
            d = _serialize_enrollment(e)
            d["student_code"] = u.user_code
            d["student_name"] = u.username
            d["course_code"] = c.course_code
            d["course_name"] = c.course_name
            d["room"] = getattr(c, "room", None)
            d["course_cost"] = (c.fee_full_payment or getattr(c, "exam_fee", 0) or 0) if getattr(e, "payment_plan", None) == "full" else ((c.fee_installment or getattr(c, "exam_fee", 0) or 0) if getattr(e, "payment_plan", None) == "installment" else 0)
            d["foc_items"] = getattr(c, "foc_items", None)
            data.append(d)
        return JSONResponse({"status_code": 200, "message": "Enrollments fetched successfully", "data": data})

    async def create_enrollment(request: Request, session: AsyncSession, payload: AdminEnrollmentCreate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        stu_r = await session.execute(select(User).where(and_(User.user_code == payload.student_code, User.role == "student")))
        student = stu_r.scalars().first()
        if not student:
            return JSONResponse({"status_code": 404, "message": "Student not found"}, status_code=404)

        c_r = await session.execute(select(Course).where(Course.course_code == payload.course_code))
        course = c_r.scalars().first()
        if not course:
            return JSONResponse({"status_code": 404, "message": "Course not found"}, status_code=404)

        # prevent duplicates
        dup_r = await session.execute(select(Enrollment).where(and_(Enrollment.student_id == student.user_id, Enrollment.course_id == course.course_id)))
        if dup_r.scalars().first():
            return JSONResponse({"status_code": 409, "message": "Student already enrolled in this course"}, status_code=409)

        enrollment_code = await _next_enrollment_code(session)
        e = Enrollment(
            enrollment_code=enrollment_code,
            student_id=student.user_id,
            course_id=course.course_id,
            status=payload.status,
            batch_no=payload.batch_no,
            payment_plan=payload.payment_plan,
            downpayment=payload.downpayment,
            installment_amount=payload.installment_amount
        )
        session.add(e)
        await session.commit()
        await session.refresh(e)
        await _log_activity(request, session, "Create Enrollment", f"Enrollment {enrollment_code} created for student {payload.student_code} in course {payload.course_code}")
        return JSONResponse({"status_code": 201, "message": "Enrollment created successfully", "data": _serialize_enrollment(e)}, status_code=201)

    async def update_enrollment(request: Request, session: AsyncSession, enrollment_code: str, payload: AdminEnrollmentUpdate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)
        r = await session.execute(select(Enrollment).where(Enrollment.enrollment_code == enrollment_code))
        e = r.scalars().first()
        if not e:
            return JSONResponse({"status_code": 404, "message": "Enrollment not found"}, status_code=404)
        if payload.status is not None:
            e.status = payload.status
        if getattr(payload, "batch_no", None) is not None:
            e.batch_no = payload.batch_no
        if getattr(payload, "payment_plan", None) is not None:
            e.payment_plan = payload.payment_plan
        if getattr(payload, "downpayment", None) is not None:
            e.downpayment = payload.downpayment
        if getattr(payload, "installment_amount", None) is not None:
            e.installment_amount = payload.installment_amount
            
        await session.commit()
        await _log_activity(request, session, "Update Enrollment", f"Enrollment {enrollment_code} updated")
        return JSONResponse({"status_code": 200, "message": "Enrollment updated successfully", "data": _serialize_enrollment(e)})

    async def delete_enrollment(request: Request, session: AsyncSession, enrollment_code: str):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)
        r = await session.execute(select(Enrollment).where(Enrollment.enrollment_code == enrollment_code))
        e = r.scalars().first()
        if not e:
            return JSONResponse({"status_code": 404, "message": "Enrollment not found"}, status_code=404)
        await session.delete(e)
        await session.commit()
        await _log_activity(request, session, "Delete Enrollment", f"Enrollment {enrollment_code} deleted")
        return JSONResponse({"status_code": 200, "message": "Enrollment deleted successfully"})

    # CRUD - Attendance

    async def mark_attendance(request: Request, session: AsyncSession, payload: AttendanceMarkRequest):
        """Mark attendance for a student. One record allowed per student per day."""
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        # Resolve user_code -> user_id
        user_query = select(User).where(and_(User.user_code == payload.student_code, User.role == "student"))
        user_result = await session.execute(user_query)
        student = user_result.scalars().first()
        if not student:
            return JSONResponse({"status_code": 404, "message": "Student not found"}, status_code=404)

        today = date.today()
        if getattr(payload, "attendance_date", None):
            try:
                today = datetime.strptime(payload.attendance_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        # Ensure attendance is within course bounds for the student
        enroll_q = select(Enrollment).join(Course, Enrollment.course_id == Course.course_id).where(
            and_(
                Enrollment.student_id == student.user_id,
                Enrollment.status == True,
                Course.start_date <= today,
                Course.end_date >= today
            )
        )
        er = await session.execute(enroll_q)
        active_enroll = er.scalars().first()
        if not active_enroll:
            return JSONResponse({"status_code": 400, "message": "Attendance is only allowed within an active course duration."}, status_code=400)

        # ── One-per-day guard ──────────────────────────────────────────────
        duplicate_query = select(Attendance).where(
            and_(
                Attendance.user_id == student.user_id,
                Attendance.attendance_date == today,
                Attendance.slot == payload.slot
            )
        )
        duplicate_result = await session.execute(duplicate_query)
        existing = duplicate_result.scalars().first()
        if existing:
            return JSONResponse(
                {
                    "status_code": 409,
                    "message": f"Attendance already marked for student '{payload.student_code}' today ({today}) slot '{payload.slot}'"
                },
                status_code=409
            )
        # ──────────────────────────────────────────────────────────────────

        new_record = Attendance(
            user_id=student.user_id,
            attendance_date=today,
            slot=payload.slot,
            check_today=payload.check_today
        )
        session.add(new_record)
        await session.commit()
        await session.refresh(new_record)
        await _log_activity(request, session, "Mark Attendance", f"Attendance marked for {payload.student_code} slot={payload.slot}")
        return JSONResponse({
            "status_code": 201,
            "message": "Attendance marked successfully",
            "data": {
                "attendance_id": new_record.attendance_id,
                "student_code": payload.student_code,
                "attendance_date": str(new_record.attendance_date),
                "slot": new_record.slot,
                "check_today": new_record.check_today
            }
        }, status_code=201)

    async def get_all_attendance(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        query = select(Attendance, User).join(User, Attendance.user_id == User.user_id)
        result = await session.execute(query)
        rows = result.all()
        return JSONResponse({
            "status_code": 200,
            "message": "Attendance records fetched successfully",
            "data": [
                {
                    "attendance_id": a.attendance_id,
                    "user_id": a.user_id,
                    "user_code": u.user_code,
                    "username": u.username,
                    "attendance_date": str(a.attendance_date),
                    "slot": a.slot,
                    "check_today": a.check_today,
                }
                for a, u in rows
            ],
        })

    async def get_specific_attendance(request: Request, session: AsyncSession, student_code: str):
        """Get all attendance records for a specific student (admin or parent)."""
        is_admin = await validating_admin_role(request)
        is_parent = await validating_parent_role(request)
        if not is_admin and not is_parent:
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        # Resolve student_code -> user_id
        user_query = select(User).where(and_(User.user_code == student_code, User.role == "student"))
        user_result = await session.execute(user_query)
        student = user_result.scalars().first()
        if not student:
            return JSONResponse({"status_code": 404, "message": "Student not found"}, status_code=404)

        query = select(Attendance).where(Attendance.user_id == student.user_id)
        result = await session.execute(query)
        records = result.scalars().all()
        return JSONResponse({
            "status_code": 200,
            "message": "Attendance records fetched successfully",
            "data": [
                {
                    "attendance_id": r.attendance_id,
                    "user_id": r.user_id,
                    "attendance_date": str(r.attendance_date),
                    "slot": r.slot,
                    "check_today": r.check_today
                }
                for r in records
            ]
        })

    async def update_attendance(request: Request, session: AsyncSession, attendance_id: int, payload: AttendanceUpdateRequest):
        """Update the check_today status of an attendance record."""
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        query = select(Attendance).where(Attendance.attendance_id == attendance_id)
        result = await session.execute(query)
        record = result.scalars().first()
        if not record:
            return JSONResponse({"status_code": 404, "message": "Attendance record not found"}, status_code=404)

        record.check_today = payload.check_today
        await session.commit()
        await _log_activity(request, session, "Update Attendance", f"Attendance ID {attendance_id} updated to {payload.check_today}")
        return JSONResponse({
            "status_code": 200,
            "message": "Attendance updated successfully",
            "data": {
                "attendance_id": record.attendance_id,
                "attendance_date": str(record.attendance_date),
                "check_today": record.check_today
            }
        })

    # CRUD - Rooms + Availability

    async def list_rooms(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(select(Room))
        rooms = r.scalars().all()

        data = []
        for room in rooms:
            # Find max enrollments of any class that meets in this room, either via Course.room or TimeTable.room_name
            q = await session.execute(
                select(func.count(Enrollment.enrollment_id))
                .select_from(Enrollment)
                .join(Course, Enrollment.course_id == Course.course_id)
                .outerjoin(TimeTable, Course.course_id == TimeTable.course_id)
                .where(
                    and_(
                        Enrollment.status == True,
                        (Course.room == room.room_name) | (TimeTable.room_name == room.room_name)
                    )
                )
                .group_by(Course.course_id)
            )
            loads = q.scalars().all()
            load = int(max(loads)) if loads else 0
            d = _serialize_room(room)
            d["current_load"] = load
            d["is_full"] = load >= room.capacity
            data.append(d)

        return JSONResponse({"status_code": 200, "message": "Rooms fetched successfully", "data": data})

    async def create_room(request: Request, session: AsyncSession, payload: AdminRoomCreate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        exists = await session.execute(select(Room).where(Room.room_name == payload.room_name))
        if exists.scalars().first():
            return JSONResponse({"status_code": 409, "message": "Room name already exists"}, status_code=409)

        room = Room(room_name=payload.room_name, capacity=payload.capacity, is_active=payload.is_active)
        session.add(room)
        await session.commit()
        await session.refresh(room)
        await _log_activity(request, session, "Create Room", f"Room '{payload.room_name}' created with capacity {payload.capacity}")
        return JSONResponse({"status_code": 201, "message": "Room created successfully", "data": _serialize_room(room)}, status_code=201)

    async def update_room(request: Request, session: AsyncSession, room_id: int, payload: AdminRoomUpdate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(select(Room).where(Room.room_id == room_id))
        room = r.scalars().first()
        if not room:
            return JSONResponse({"status_code": 404, "message": "Room not found"}, status_code=404)

        if payload.room_name is not None:
            room.room_name = payload.room_name
        if payload.capacity is not None:
            room.capacity = payload.capacity
        if payload.is_active is not None:
            room.is_active = payload.is_active

        await session.commit()
        await _log_activity(request, session, "Update Room", f"Room ID {room_id} updated")
        return JSONResponse({"status_code": 200, "message": "Room updated successfully", "data": _serialize_room(room)})

    async def delete_room(request: Request, session: AsyncSession, room_id: int):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(select(Room).where(Room.room_id == room_id))
        room = r.scalars().first()
        if not room:
            return JSONResponse({"status_code": 404, "message": "Room not found"}, status_code=404)

        await session.delete(room)
        await session.commit()
        await _log_activity(request, session, "Delete Room", f"Room ID {room_id} deleted")
        return JSONResponse({"status_code": 200, "message": "Room deleted successfully"})

    @staticmethod
    def _parse_hhmm(s: str) -> int:
        hh, mm = s.split(":")
        return int(hh) * 60 + int(mm)

    @staticmethod
    def _fmt_hhmm(m: int) -> str:
        return f"{m // 60:02d}:{m % 60:02d}"

    async def get_room_availability(request: Request, session: AsyncSession, room_id: int, day: str):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(select(Room).where(Room.room_id == room_id))
        room = r.scalars().first()
        if not room:
            return JSONResponse({"status_code": 404, "message": "Room not found"}, status_code=404)

        tt_r = await session.execute(
            select(TimeTable).where(and_(TimeTable.day_of_week == day, TimeTable.room_name == room.room_name))
        )
        slots = tt_r.scalars().all()

        busy = []
        for s in slots:
            try:
                busy.append((AdminPanelService._parse_hhmm(s.start_time), AdminPanelService._parse_hhmm(s.end_time)))
            except Exception:
                continue
        busy.sort()

        merged = []
        for st, en in busy:
            if not merged or st > merged[-1][1]:
                merged.append([st, en])
            else:
                merged[-1][1] = max(merged[-1][1], en)

        day_start = 8 * 60
        day_end = 18 * 60
        free = []
        cursor = day_start
        for st, en in merged:
            if st > cursor:
                free.append((cursor, st))
            cursor = max(cursor, en)
        if cursor < day_end:
            free.append((cursor, day_end))

        return JSONResponse(
            {
                "status_code": 200,
                "message": "Room availability fetched successfully",
                "data": {
                    "room": _serialize_room(room),
                    "day": day,
                    "busy": [{"start": AdminPanelService._fmt_hhmm(st), "end": AdminPanelService._fmt_hhmm(en)} for st, en in merged],
                    "free": [{"start": AdminPanelService._fmt_hhmm(st), "end": AdminPanelService._fmt_hhmm(en)} for st, en in free],
                },
            }
        )

    # Timetables

    async def list_timetables(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(
            select(TimeTable, Course)
            .join(Course, TimeTable.course_id == Course.course_id)
        )
        rows = r.all()
        data = []
        for t, c in rows:
            data.append(
                {
                    "timetable_id": t.timetable_id,
                    "day_of_week": t.day_of_week,
                    "start_time": t.start_time,
                    "end_time": t.end_time,
                    "room_name": t.room_name,
                    "course_id": c.course_id,
                    "course_code": c.course_code,
                    "course_name": c.course_name,
                }
            )
        return JSONResponse({"status_code": 200, "message": "Timetables fetched successfully", "data": data})

    async def create_timetable(request: Request, session: AsyncSession, payload: AdminTimeTableCreate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        c_r = await session.execute(select(Course).where(Course.course_code == payload.course_code))
        course = c_r.scalars().first()
        if not course:
            return JSONResponse({"status_code": 404, "message": "Course not found"}, status_code=404)

        tt = TimeTable(
            course_id=course.course_id,
            day_of_week=payload.day_of_week,
            start_time=payload.start_time,
            end_time=payload.end_time,
            room_name=payload.room_name,
        )
        session.add(tt)
        await session.commit()
        await session.refresh(tt)
        await _log_activity(request, session, "Create Timetable", f"Timetable for {payload.course_code} on {payload.day_of_week} {payload.start_time}-{payload.end_time} created")
        return JSONResponse({"status_code": 201, "message": "Timetable created successfully", "data": {"timetable_id": tt.timetable_id}}, status_code=201)

    async def update_timetable(request: Request, session: AsyncSession, timetable_id: int, payload: AdminTimeTableUpdate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(select(TimeTable).where(TimeTable.timetable_id == timetable_id))
        tt = r.scalars().first()
        if not tt:
            return JSONResponse({"status_code": 404, "message": "Timetable not found"}, status_code=404)

        if payload.day_of_week is not None:
            tt.day_of_week = payload.day_of_week
        if payload.start_time is not None:
            tt.start_time = payload.start_time
        if payload.end_time is not None:
            tt.end_time = payload.end_time
        if payload.room_name is not None:
            tt.room_name = payload.room_name

        await session.commit()
        await _log_activity(request, session, "Update Timetable", f"Timetable ID {timetable_id} updated")
        return JSONResponse({"status_code": 200, "message": "Timetable updated successfully"})

    async def delete_timetable(request: Request, session: AsyncSession, timetable_id: int):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        r = await session.execute(select(TimeTable).where(TimeTable.timetable_id == timetable_id))
        tt = r.scalars().first()
        if not tt:
            return JSONResponse({"status_code": 404, "message": "Timetable not found"}, status_code=404)
        await session.delete(tt)
        await session.commit()
        await _log_activity(request, session, "Delete Timetable", f"Timetable ID {timetable_id} deleted")
        return JSONResponse({"status_code": 200, "message": "Timetable deleted successfully"})

    # --- Payments CRUD ---
    async def list_payments(request: Request, session: AsyncSession):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        query = (
            select(Payment, Enrollment, User, Course)
            .join(Enrollment, Payment.enrollment_id == Enrollment.enrollment_id)
            .join(User, Enrollment.student_id == User.user_id)
            .join(Course, Enrollment.course_id == Course.course_id)
        )
        r = await session.execute(query)
        rows = r.all()
        
        data = []
        for p, e, u, c in rows:
            data.append({
                "payment_id": p.payment_id,
                "enrollment_id": e.enrollment_id,
                "enrollment_code": e.enrollment_code,
                "amount": p.amount,
                "payment_date": str(p.payment_date),
                "month": p.month,
                "status": p.status,
                "student_code": u.user_code,
                "student_name": u.username,
                "course_code": c.course_code,
                "course_name": c.course_name,
                "payment_plan": e.payment_plan,
                "payment_method": getattr(p, "payment_method", None),
                "course_cost": c.fee_full_payment if getattr(e, "payment_plan", None) == "full" else (c.fee_installment if getattr(e, "payment_plan", None) == "installment" else 0),
                "foc_items": getattr(c, "foc_items", None),
                "downpayment": getattr(e, "downpayment", 0) or 0,
                "installment_amount": getattr(e, "installment_amount", 0) or 0,
                "fine_amount": getattr(p, "fine_amount", 0) or 0,
                "extra_items_fee": getattr(p, "extra_items_fee", 0) or 0,
                "extra_items": getattr(p, "extra_items", None),
                "fine_reason": getattr(p, "fine_reason", None),
                "exam_fee_paid_gbp": getattr(p, "exam_fee_paid_gbp", 0) or 0,
                "exam_fee_paid_mmk": getattr(p, "exam_fee_paid_mmk", 0) or 0,
                "exam_fee_currency": getattr(p, "exam_fee_currency", "MMK")
            })
            
        return JSONResponse({"status_code": 200, "message": "Payments fetched successfully", "data": data})

    async def create_payment(request: Request, session: AsyncSession, payload: PaymentCreate):
        if not await validating_admin_role(request, allow_sales=True):
            return JSONResponse({"status_code": 403, "message": "You are not authorized to perform this action"}, status_code=403)

        enroll_r = await session.execute(select(Enrollment).where(Enrollment.enrollment_id == payload.enrollment_id))
        enroll = enroll_r.scalars().first()
        if not enroll:
            return JSONResponse({"status_code": 404, "message": "Enrollment not found"}, status_code=404)

        pay = Payment(
            enrollment_id=payload.enrollment_id,
            amount=payload.amount,
            month=payload.month,
            status=payload.status or "Paid",
            payment_method=payload.payment_method,
            fine_amount=getattr(payload, "fine_amount", None),
            fine_reason=getattr(payload, "fine_reason", None),
            extra_items_fee=getattr(payload, "extra_items_fee", None),
            extra_items=getattr(payload, "extra_items", None),
            exam_fee_paid_gbp=getattr(payload, "exam_fee_paid_gbp", None),
            exam_fee_paid_mmk=getattr(payload, "exam_fee_paid_mmk", None),
            exam_fee_currency=getattr(payload, "exam_fee_currency", "MMK")
        )
        session.add(pay)
        await session.commit()
        await session.refresh(pay)
        await _log_activity(request, session, "Create Payment", f"Payment of {payload.amount} recorded for enrollment {payload.enrollment_id} ({payload.month})")
        return JSONResponse({"status_code": 201, "message": "Payment recorded successfully"})