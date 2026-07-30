from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.model import Attendance, Batch, Course, Subject, TimeTable, User, Enrollment
from app.services.rbac_portal import validating_teacher_role
from datetime import datetime
from app.core.timezone_utils import get_now_local


def _user_from_request(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


class TeacherPortalService:
    @staticmethod
    def _time_to_minutes(v: str) -> int:
        """Parse HH:MM to minutes; raises ValueError on bad format."""
        dt = datetime.strptime(v, "%H:%M")
        return dt.hour * 60 + dt.minute

    @staticmethod
    async def _resolve_teacher(request: Request, session: AsyncSession) -> User:
        await validating_teacher_role(request)
        user_code = _user_from_request(request).get("user_code")
        q = select(User).where(and_(User.user_code == user_code, User.role == "teacher"))
        r = await session.execute(q)
        teacher = r.scalars().first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found")
        return teacher

    @staticmethod
    async def get_my_class_information(request: Request, session: AsyncSession):
        """
        Return all classes this teacher needs to teach, including:
        teacher name/code, course, subject, batch, room, day/time.
        """
        teacher = await TeacherPortalService._resolve_teacher(request, session)
        current_date = get_now_local().date()

        # Query 1: timetable rows relevant to this teacher
        tt_q = (
            select(TimeTable, Course, Batch, Subject)
            .join(Course, TimeTable.course_id == Course.course_id)
            .outerjoin(Batch, TimeTable.batch_id == Batch.batch_id)
            .outerjoin(Subject, TimeTable.subject_id == Subject.subject_id)
            .where(
                and_(
                    or_(
                        TimeTable.teacher_id == teacher.user_id,   # explicitly assigned
                        Course.instructor_id == teacher.user_id,   # course instructor fallback
                        Batch.instructor_id == teacher.user_id,    # batch instructor fallback
                    ),
                    or_(
                        Batch.batch_id.is_(None),
                        and_(
                            or_(Batch.start_date.is_(None), Batch.start_date <= current_date),
                            or_(Batch.end_date.is_(None), Batch.end_date >= current_date)
                        )
                    )
                )
            )
            .order_by(TimeTable.day_of_week, TimeTable.start_time)
        )
        tt_r = await session.execute(tt_q)
        timetable_rows = tt_r.unique().all()

        # Query 2: teacher's courses
        c_r = await session.execute(select(Course).where(Course.instructor_id == teacher.user_id))
        courses = c_r.scalars().all()
        course_ids = [c.course_id for c in courses]

        # Query 3: teacher's batches
        b_r = await session.execute(select(Batch).where(Batch.instructor_id == teacher.user_id))
        batches = b_r.scalars().all()
        batch_by_course = {}
        for b in batches:
            batch_by_course.setdefault(b.course_id, []).append(b)

        # Query 4: subjects for all teacher courses (single batched query)
        subjects_by_course = {}
        if course_ids:
            s_r = await session.execute(select(Subject).where(Subject.course_id.in_(course_ids)))
            subjects = s_r.scalars().all()
            for s in subjects:
                subjects_by_course.setdefault(s.course_id, []).append(s)

        # Query 5: total active students per batch (single grouped query)
        cnt_r = await session.execute(
            select(Enrollment.batch_id, func.count(Enrollment.enrollment_id))
            .where(and_(Enrollment.batch_id.isnot(None), Enrollment.status == True))
            .group_by(Enrollment.batch_id)
        )
        batch_student_count = {bid: int(total) for bid, total in cnt_r.all()}

        data = []
        for tt, c, b, s in timetable_rows:
            data.append(
                {
                    "timetable_id": tt.timetable_id,
                    "teacher_name": teacher.username,
                    "teacher_code": teacher.user_code,
                    "course_id": c.course_id,
                    "course_code": c.course_code,
                    "course_name": c.course_name,
                    "subject_id": s.subject_id if s else None,
                    "subject_code": s.subject_code if s else None,
                    "subject_name": s.subject_name if s else None,
                    "batch_id": b.batch_id if b else None,
                    "batch_no": b.batch_no if b else None,
                    "batch_start_date": b.start_date.isoformat() if b and b.start_date else None,
                    "batch_end_date": b.end_date.isoformat() if b and b.end_date else None,
                    "total_students": batch_student_count.get(b.batch_id, 0) if b else 0,
                    "room": tt.room_name or (b.room if b else c.room),
                    "day_of_week": tt.day_of_week,
                    "start_time": tt.start_time,
                    "end_time": tt.end_time,
                }
            )

        # Fallback rows: class information even without timetable
        existing_keys = {
            (
                item.get("course_id"),
                item.get("batch_id"),
                item.get("subject_id"),
                item.get("day_of_week"),
                item.get("start_time"),
                item.get("end_time"),
            )
            for item in data
        }

        for c in courses:
            subjects = subjects_by_course.get(c.course_id, [None]) or [None]
            target_batches = batch_by_course.get(c.course_id, [None])

            for b in target_batches:
                if b:
                    if b.start_date and current_date < b.start_date:
                        continue
                    if b.end_date and current_date > b.end_date:
                        continue
                for s in subjects:
                    key = (c.course_id, b.batch_id if b else None, s.subject_id if s else None, None, None, None)
                    if key in existing_keys:
                        continue
                    data.append(
                        {
                            "timetable_id": None,
                            "teacher_name": teacher.username,
                            "teacher_code": teacher.user_code,
                            "course_id": c.course_id,
                            "course_code": c.course_code,
                            "course_name": c.course_name,
                            "subject_id": s.subject_id if s else None,
                            "subject_code": s.subject_code if s else None,
                            "subject_name": s.subject_name if s else None,
                            "batch_id": b.batch_id if b else None,
                            "batch_no": b.batch_no if b else None,
                            "total_students": batch_student_count.get(b.batch_id, 0) if b else 0,
                            "room": (b.room if b else None) or c.room,
                            "day_of_week": None,
                            "start_time": None,
                            "end_time": None,
                        }
                    )
                    existing_keys.add(key)

        return JSONResponse({"success": True, "data": data, "error": None})

    @staticmethod
    async def total_classes_taught(request: Request, session: AsyncSession):
        teacher = await TeacherPortalService._resolve_teacher(request, session)
        current_date = get_now_local().date()
        q = (
            select(func.count(TimeTable.timetable_id))
            .outerjoin(Batch, TimeTable.batch_id == Batch.batch_id)
            .where(
                and_(
                    TimeTable.teacher_id == teacher.user_id,
                    or_(
                        Batch.batch_id.is_(None),
                        and_(
                            or_(Batch.start_date.is_(None), Batch.start_date <= current_date),
                            or_(Batch.end_date.is_(None), Batch.end_date >= current_date)
                        )
                    )
                )
            )
        )
        
        r = await session.execute(q)
        total_classes = r.scalar() or 0
        return JSONResponse({"success": True, "data": total_classes, "error": None})
    
    @staticmethod
    async def total_students_taught(request: Request, session: AsyncSession):
        teacher = await TeacherPortalService._resolve_teacher(request, session)
        # Total students for each batch taught by this teacher
        q = (
            select(Batch.batch_id, Batch.batch_no, func.count(Enrollment.enrollment_id).label("total_students"))
            .outerjoin(Enrollment, and_(Enrollment.batch_id == Batch.batch_id, Enrollment.status == True))
            .where(Batch.instructor_id == teacher.user_id)
            .group_by(Batch.batch_id, Batch.batch_no)
            .order_by(Batch.batch_no)
        )
        r = await session.execute(q)
        rows = r.all()
        data = [
            {
                "batch_id": batch_id,
                "batch_no": batch_no,
                "total_students": int(total_students or 0),
            }
            for batch_id, batch_no, total_students in rows
        ]
        return JSONResponse({"success": True, "data": data, "error": None})
    
    @staticmethod
    async def total_hours_taught_daily(request: Request, session: AsyncSession):
        teacher = await TeacherPortalService._resolve_teacher(request, session)
        today_name = datetime.now().strftime("%A")
        current_date = get_now_local().date()
        q = (
            select(TimeTable.start_time, TimeTable.end_time)
            .outerjoin(Batch, TimeTable.batch_id == Batch.batch_id)
            .where(
                and_(
                    TimeTable.teacher_id == teacher.user_id,
                    TimeTable.day_of_week == today_name,
                    or_(
                        Batch.batch_id.is_(None),
                        and_(
                            or_(Batch.start_date.is_(None), Batch.start_date <= current_date),
                            or_(Batch.end_date.is_(None), Batch.end_date >= current_date)
                        )
                    )
                )
            )
        )
        r = await session.execute(q)
        rows = r.all()

        total_minutes = 0
        for start_time, end_time in rows:
            if not start_time or not end_time:
                continue
            try:
                start_m = TeacherPortalService._time_to_minutes(start_time)
                end_m = TeacherPortalService._time_to_minutes(end_time)
            except ValueError:
                continue
            if end_m > start_m:
                total_minutes += (end_m - start_m)

        total_hours = round(total_minutes / 60, 2)
        return JSONResponse(
            {
                "success": True,
                "data": {
                    "day_of_week": today_name,
                    "total_hours": total_hours,
                    "total_minutes": total_minutes,
                    "total_slots": len(rows),
                },
                "error": None,
            }
        )

    @staticmethod
    async def total_subjects_taught(request: Request, session: AsyncSession):
        teacher = await TeacherPortalService._resolve_teacher(request, session)

        # Collect course_ids from ALL assignment paths
        course_ids = set()

        # 1) Courses where teacher is the instructor
        c_r = await session.execute(
            select(Course.course_id).where(Course.instructor_id == teacher.user_id)
        )
        course_ids.update(row[0] for row in c_r.all())

        # 2) Batches where teacher is the instructor → get their course_ids
        b_r = await session.execute(
            select(Batch.course_id).where(Batch.instructor_id == teacher.user_id)
        )
        course_ids.update(row[0] for row in b_r.all())

        # 3) Timetable entries where teacher is explicitly assigned → get their course_ids
        tt_r = await session.execute(
            select(TimeTable.course_id).where(TimeTable.teacher_id == teacher.user_id)
        )
        course_ids.update(row[0] for row in tt_r.all())

        # Also collect subject_ids directly from timetable (teacher may be assigned a specific subject)
        direct_subject_ids = set()
        ts_r = await session.execute(
            select(TimeTable.subject_id).where(
                and_(TimeTable.teacher_id == teacher.user_id, TimeTable.subject_id.isnot(None))
            )
        )
        direct_subject_ids.update(row[0] for row in ts_r.all())

        # Count distinct subjects: from courses OR directly assigned in timetable
        all_subject_ids = set(direct_subject_ids)

        if course_ids:
            s_r = await session.execute(
                select(Subject.subject_id).where(Subject.course_id.in_(list(course_ids)))
            )
            all_subject_ids.update(row[0] for row in s_r.all())

        total_subjects = len(all_subject_ids)

        return JSONResponse({"success": True, "data": total_subjects, "error": None})

    @staticmethod
    async def attendance_per_batch(request: Request, session: AsyncSession):
        """
        Return attendance statistics (total, present, rate) for each batch
        that this teacher is assigned to.
        """
        teacher = await TeacherPortalService._resolve_teacher(request, session)

        # Collect all batch_ids associated with this teacher
        batch_ids = set()

        # 1) Batches where teacher is the batch instructor
        b_r = await session.execute(
            select(Batch.batch_id).where(Batch.instructor_id == teacher.user_id)
        )
        batch_ids.update(row[0] for row in b_r.all())

        # 2) Batches from courses where teacher is the course instructor
        cb_r = await session.execute(
            select(Batch.batch_id)
            .join(Course, Batch.course_id == Course.course_id)
            .where(Course.instructor_id == teacher.user_id)
        )
        batch_ids.update(row[0] for row in cb_r.all())

        # 3) Batches from timetable entries where teacher is explicitly assigned
        tb_r = await session.execute(
            select(TimeTable.batch_id).where(
                and_(TimeTable.teacher_id == teacher.user_id, TimeTable.batch_id.isnot(None))
            )
        )
        batch_ids.update(row[0] for row in tb_r.all())

        if not batch_ids:
            return JSONResponse({"success": True, "data": [], "error": None})

        # Get batch info (batch_no) for display
        batch_info_r = await session.execute(
            select(Batch.batch_id, Batch.batch_no).where(Batch.batch_id.in_(list(batch_ids)))
        )
        batch_info = {bid: bno for bid, bno in batch_info_r.all()}

        data = []
        for bid in batch_ids:
            # Total attendance records for this batch
            total_q = select(func.count(Attendance.attendance_id)).where(
                Attendance.batch_id == bid
            )
            total_r = await session.execute(total_q)
            total = total_r.scalar() or 0

            # Present count (check_today == True)
            present_q = select(func.count(Attendance.attendance_id)).where(
                and_(Attendance.batch_id == bid, Attendance.check_today == True)
            )
            present_r = await session.execute(present_q)
            present = present_r.scalar() or 0

            rate = round((present / total * 100), 1) if total > 0 else 0.0
            data.append({
                "batch_id": bid,
                "batch_no": batch_info.get(bid, f"Batch {bid}"),
                "total_records": int(total),
                "present_count": int(present),
                "attendance_rate": rate,
            })

        # Sort by batch_no for consistent ordering
        data.sort(key=lambda x: x["batch_no"])

        return JSONResponse({"success": True, "data": data, "error": None})