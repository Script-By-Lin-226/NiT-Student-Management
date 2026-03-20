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

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# ==============================
# User Model
# ==============================

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_code = Column(String, unique=True, index=True)

    username = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    nrc = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    parent_name = Column(String, nullable=True)
    parent_phone = Column(String, nullable=True)
    profile_picture = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)
    data_of_birth = Column(DateTime, nullable=False)
    role = Column(String, nullable=False, default="student")

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    courses = relationship("Course", back_populates="instructor")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="student", cascade="all, delete-orphan")
    attendance = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    staff_attendance = relationship("StaffAttendance", back_populates="staff_member", cascade="all, delete-orphan")

    # Parent → children (when role=parent)
    children = relationship(
        "ParentStudent",
        foreign_keys="ParentStudent.parent_id",
        back_populates="parent",
        cascade="all, delete-orphan"
    )
    # Student → parents (when role=student)
    parents = relationship(
        "ParentStudent",
        foreign_keys="ParentStudent.student_id",
        back_populates="student_user",
        cascade="all, delete-orphan"
    )


# ==============================
# Academic Year Model
# ==============================

class AcademicYear(Base):
    __tablename__ = "academic_years"

    academic_year_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    year_name = Column(String, unique=True, index=True)

    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    # Relationship
    courses = relationship("Course", back_populates="academic_year")


# ==============================
# Course Model
# ==============================

class Course(Base):
    __tablename__ = "courses"

    course_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_code = Column(String, unique=True, index=True)

    course_name = Column(String, index=True, nullable=False)

    academicyear_id = Column(
        Integer,
        ForeignKey("academic_years.academic_year_id"),
        nullable=False
    )

    instructor_id = Column(
        Integer,
        ForeignKey("users.user_id")
    )

    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    room = Column(String, nullable=True) # e.g. "room 6"
    cost = Column(Float, nullable=True)
    discount_plan = Column(String, nullable=True)


    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    instructor = relationship("User", back_populates="courses")
    academic_year = relationship("AcademicYear", back_populates="courses")

    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    timetable = relationship("TimeTable", back_populates="course", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="course", cascade="all, delete-orphan")


# ==============================
# Enrollment Model
# ==============================

class Enrollment(Base):
    __tablename__ = "enrollments"

    enrollment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    enrollment_code = Column(String, unique=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE")
    )

    course_id = Column(
        Integer,
        ForeignKey("courses.course_id", ondelete="CASCADE")
    )

    enrollment_date = Column(DateTime, default=func.now())
    status = Column(Boolean, default=True)
    
    batch_no = Column(String, nullable=True)
    payment_plan = Column(String, nullable=True)
    downpayment = Column(Float, nullable=True)
    installment_amount = Column(Float, nullable=True)

    # Relationships
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
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
        nullable=False
    )

    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, default=func.now())
    month = Column(String, nullable=False) # e.g., "March 2026", "April 2026"
    status = Column(String, default="Paid")
    payment_method = Column(String, nullable=True) # KBZPay, AYA Pay, Cash, MMQR, Banking

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
        ForeignKey("courses.course_id", ondelete="CASCADE")
    )

    day_of_week = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    room_name = Column(String, nullable=True)  # e.g. "Room 6"

    # Relationship
    course = relationship("Course", back_populates="timetable")


# ==============================
# Grade Model
# ==============================

class Grade(Base):
    __tablename__ = "grades"

    grade_id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE")
    )

    course_id = Column(
        Integer,
        ForeignKey("courses.course_id", ondelete="CASCADE")
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
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    attendance_date = Column(Date, nullable=False, default=date.today)
    slot = Column(String, nullable=False, default="Morning") # "Morning", "Afternoon", "Evening"
    check_today = Column(Boolean, nullable=False, default=False)

    # Enforce: one record per student per day per slot
    __table_args__ = (
        UniqueConstraint('user_id', 'attendance_date', 'slot', name='uq_user_attendance_date_slot'),
    )

    student = relationship("User", back_populates="attendance")


# ==============================
# Parent ↔ Student Link
# ==============================

class ParentStudent(Base):
    __tablename__ = "parent_student"

    id = Column(Integer, primary_key=True, autoincrement=True)

    parent_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    student_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )
    relationship_label = Column(String, default="parent")  # e.g. mother, father, guardian

    __table_args__ = (
        UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),
    )

    # Back-references
    parent = relationship("User", foreign_keys=[parent_id], back_populates="children")
    student_user = relationship("User", foreign_keys=[student_id], back_populates="parents")


# ==============================
# Staff Attendance Model
# (hr, manager, sales, teacher)
# ==============================

class StaffAttendance(Base):
    __tablename__ = "staff_attendances"

    attendance_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    attendance_date = Column(Date, nullable=False, default=date.today)
    check_in_time = Column(String, nullable=True)   # e.g. "09:05"
    check_out_time = Column(String, nullable=True)  # e.g. "17:30"
    status = Column(String, nullable=False, default="present")  # present | absent | late
    note = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "attendance_date", name="uq_staff_attendance_date"),
    )

    staff_member = relationship("User", back_populates="staff_attendance")

# ==============================
# Activity Log Model
# ==============================

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=func.now())

    user = relationship("User")
