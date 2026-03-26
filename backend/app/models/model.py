from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, func, Date, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from app.core.database_initialization import Base
from datetime import date

# Supported roles: student | parent | teacher | admin | hr | manager | sales

# ==============================
# Room Model
# ==============================

class Room(Base):
    __tablename__ = "rooms"

    room_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_name = Column(String, unique=True, index=True, nullable=False)  # e.g. "Room 6"
    capacity = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==============================
# Academic Year Model
# ==============================

class AcademicYear(Base):
    __tablename__ = "academic_years"

    academic_year_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    academic_year_name = Column(String, unique=True, index=True, nullable=False)  # e.g. "2023-2024"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    courses = relationship("Course", back_populates="academic_year")


# ==============================
# User Model (Core)
# ==============================

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_code = Column(String, unique=True, index=True, nullable=False)  # e.g. STU001 or TEA001
    username = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    
    nrc = Column(String, nullable=True) # ID card
    gender = Column(String, nullable=True) # male / female
    phone = Column(String, nullable=True)
    parent_name = Column(String, nullable=True)
    parent_phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    profile_picture = Column(Text, nullable=True) # Base64 or URL
    
    data_of_birth = Column(DateTime, nullable=True)
    role = Column(String, nullable=False, default="student") # admin, teacher, student, parent, hr, manager, sales
    
    is_active = Column(Boolean, default=True)
    
    # Registration extra info
    how_did_you_hear = Column(String, nullable=True) # comma separated
    student_type = Column(String, nullable=True) # New Student, Returning, etc.
    intended_course_code = Column(String, nullable=True)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    courses = relationship("Course", back_populates="instructor") # if teacher
    enrollments = relationship("Enrollment", back_populates="student") # if student
    attendance = relationship("Attendance", back_populates="student")
    grades = relationship("Grade", back_populates="student")


# ==============================
# Course Model
# ==============================

class Course(Base):
    __tablename__ = "courses"

    course_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_code = Column(String, unique=True, index=True, nullable=False) # e.g. CRS001
    course_name = Column(String, nullable=False)
    
    academicyear_id = Column(
        Integer,
        ForeignKey("academic_years.academic_year_id"),
        index=True
    )

    instructor_id = Column(
        Integer,
        ForeignKey("users.user_id"),
        index=True,
        nullable=True
    )

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    room = Column(String, nullable=True) # e.g. "room 6"
    fee_full_payment = Column(Float, nullable=True)
    fee_installment = Column(Float, nullable=True)
    exam_fee = Column(Float, nullable=True)
    exam_fee_gbp = Column(Float, nullable=True) # Fee in Pounds (GBP) as mentioned by user
    foc_items = Column(String, nullable=True)
    category = Column(String, nullable=True)


    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    instructor = relationship("User", back_populates="courses")
    academic_year = relationship("AcademicYear", back_populates="courses")

    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    timetable = relationship("TimeTable", back_populates="course", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="course", cascade="all, delete-orphan")
    batches = relationship("Batch", back_populates="course", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="course", cascade="all, delete-orphan")

# ==============================
# Batch Model
# ==============================

class Batch(Base):
    __tablename__ = "batches"

    batch_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_no = Column(String, nullable=False) # "Batch 1", "Batch 2" etc, manual
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), nullable=False)
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    room = Column(String, nullable=True)
    instructor_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    course = relationship("Course", back_populates="batches")
    instructor = relationship("User")
    enrollments = relationship("Enrollment", back_populates="batch", cascade="all, delete-orphan")
    attendance = relationship("Attendance", back_populates="batch", cascade="all, delete-orphan")
    timetables = relationship("TimeTable", back_populates="batch", cascade="all, delete-orphan")


# ==============================
# Subject Model
# ==============================

class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_code = Column(String, unique=True, index=True, nullable=False) # e.g. SUB001
    subject_name = Column(String, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="CASCADE"), nullable=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    course = relationship("Course", back_populates="subjects")


# ==============================
# Enrollment Model
# ==============================

class Enrollment(Base):
    __tablename__ = "enrollments"

    enrollment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    enrollment_code = Column(String, unique=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True
    )

    course_id = Column(
        Integer,
        ForeignKey("courses.course_id", ondelete="CASCADE"),
        index=True
    )

    batch_id = Column(
        Integer,
        ForeignKey("batches.batch_id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )

    enrollment_date = Column(DateTime, default=func.now(), index=True)
    status = Column(Boolean, default=True)
    
    batch_no = Column(String, nullable=True) # Kept for migration / legacy
    payment_plan = Column(String, nullable=True)
    downpayment = Column(Float, nullable=True)
    installment_amount = Column(Float, nullable=True)

    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    batch = relationship("Batch", back_populates="enrollments")
    payments = relationship("Payment", back_populates="enrollment", cascade="all, delete-orphan")


# ==============================
# Payment Model
# ==============================

class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    enrollment_id = Column(
        Integer,
        ForeignKey("enrollments.enrollment_id", ondelete="CASCADE"),
        index=True
    )

    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, default=func.now(), index=True)
    month = Column(String, nullable=True) # e.g. "January" or "Jan 2024"
    status = Column(String, default="Paid") # Paid, Pending, Overdue
    
    payment_method = Column(String, nullable=True) # Cash, Bank Transfer, KPay, etc.
    fine_amount = Column(Float, nullable=True)
    fine_reason = Column(String, nullable=True)
    extra_items_fee = Column(Float, nullable=True)
    extra_items = Column(String, nullable=True)
    
    # Exam fee fields
    exam_fee_paid_gbp = Column(Float, nullable=True)
    exam_fee_paid_mmk = Column(Float, nullable=True)
    exam_fee_currency = Column(String, default="MMK") # MMK or GBP
    discount_amount = Column(Float, nullable=True, default=0.0)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    enrollment = relationship("Enrollment", back_populates="payments")


# ==============================
# Timetable Model
# ==============================

class TimeTable(Base):
    __tablename__ = "timetables"

    timetable_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(
        Integer,
        ForeignKey("courses.course_id", ondelete="CASCADE"),
        index=True
    )
    batch_id = Column(
        Integer,
        ForeignKey("batches.batch_id", ondelete="CASCADE"),
        index=True,
        nullable=True
    )
    teacher_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )
    subject_id = Column(
        Integer,
        ForeignKey("subjects.subject_id", ondelete="SET NULL"),
        index=True,
        nullable=True
    )

    day_of_week = Column(String, nullable=False) # Monday, Tuesday...
    start_time = Column(String, nullable=False) # 09:00
    end_time = Column(String, nullable=False)   # 12:00
    room_name = Column(String, nullable=True)

    # Relationships
    course = relationship("Course", back_populates="timetable")
    batch = relationship("Batch", back_populates="timetables")
    teacher = relationship("User")
    subject = relationship("Subject")


# ==============================
# Grade Model
# ==============================

class Grade(Base):
    __tablename__ = "grades"

    grade_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    student_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True
    )

    course_id = Column(
        Integer,
        ForeignKey("courses.course_id", ondelete="CASCADE"),
        index=True
    )

    grade = Column(String, nullable=False)
    grade_point = Column(Float, nullable=False)

    created_at = Column(DateTime, default=func.now())

    # Relationships
    student = relationship("User", back_populates="grades")
    course = relationship("Course", back_populates="grades")
    
class Attendance(Base):
    __tablename__ = 'attendances'

    attendance_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True, nullable=False)
    course_id = Column(Integer, ForeignKey("courses.course_id", ondelete="SET NULL"), index=True, nullable=True)
    batch_id = Column(Integer, ForeignKey("batches.batch_id", ondelete="SET NULL"), index=True, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id", ondelete="SET NULL"), index=True, nullable=True)
    timetable_id = Column(Integer, ForeignKey("timetables.timetable_id", ondelete="SET NULL"), index=True, nullable=True)
    attendance_date = Column(Date, nullable=False, default=date.today, index=True)
    slot = Column(String, nullable=False, default="Morning") # "Morning", "Afternoon", "Evening" or Time slot
    check_today = Column(Boolean, nullable=False, default=False)

    # Enforce: one record per student per day per slot/timetable_id per subject
    __table_args__ = (
        # Note: If timetable_id is used, slot might be redundant but keeping for backward compatibility
        # Adding subject_id to unique constraint allows multiple subjects per day/slot
        UniqueConstraint('user_id', 'attendance_date', 'slot', 'subject_id', name='uq_user_attendance_date_slot_subject'),
    )

    student = relationship("User", back_populates="attendance")
    course = relationship("Course")
    batch = relationship("Batch", back_populates="attendance")
    subject = relationship("Subject")
    timetable = relationship("TimeTable")


# ==============================
# Parent \u2194 Student Link
# ==============================

class ParentStudent(Base):
    __tablename__ = "parent_student"

    id = Column(Integer, primary_key=True, autoincrement=True)

    parent_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    student_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    relationship_label = Column(String, nullable=True) # e.g. "Father", "Mother"

    # Enforce unique links
    __table_args__ = (
        UniqueConstraint('parent_id', 'student_id', name='uq_parent_student'),
    )


# ==============================
# Staff Attendance
# ==============================

class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True, nullable=False)
    
    date = Column(Date, nullable=False, default=date.today, index=True)
    time_in = Column(DateTime, nullable=True)
    time_out = Column(DateTime, nullable=True)
    
    status = Column(String, default="Present") # Present, Absent, Leave

    created_at = Column(DateTime, default=func.now())

    # Enforce one record per day
    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='uq_staff_attendance_day'),
    )

    user = relationship("User")


# ==============================
# Activity Log Model
# ==============================

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True, nullable=False)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=func.now(), index=True)

    user = relationship("User")

# ==============================
# Token Management
# ==============================

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User")
