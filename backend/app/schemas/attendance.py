from pydantic import BaseModel
from datetime import date


class AttendanceMarkRequest(BaseModel):
    """Schema for marking a student's attendance."""
    student_code: str
    slot: str
    check_today: bool = True


class AttendanceUpdateRequest(BaseModel):
    """Schema for updating an existing attendance record."""
    check_today: bool


class AttendanceResponse(BaseModel):
    attendance_id: int
    user_id: int
    attendance_date: date
    slot: str
    check_today: bool

    class Config:
        from_attributes = True
