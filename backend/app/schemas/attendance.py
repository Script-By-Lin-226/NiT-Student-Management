from pydantic import BaseModel
from datetime import date
from typing import Optional


class AttendanceMarkRequest(BaseModel):
    """Schema for marking a student's attendance."""
    student_code: str
    slot: str
    course_id: Optional[int] = None
    subject_id: Optional[int] = None
    timetable_id: Optional[int] = None
    check_today: bool = True
    attendance_date: Optional[str] = None


class AttendanceUpdateRequest(BaseModel):
    """Schema for updating an existing attendance record."""
    check_today: bool


class AttendanceResponse(BaseModel):
    attendance_id: int
    user_id: int
    course_id: Optional[int] = None
    subject_id: Optional[int] = None
    batch_id: Optional[int] = None
    attendance_date: date
    slot: str
    check_today: bool

    class Config:
        from_attributes = True
