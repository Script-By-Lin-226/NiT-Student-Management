from pydantic import BaseModel
from typing import Optional


class TimeTableBase(BaseModel):
    timetable_id: int
    course_id: int
    subject_id: Optional[int] = None
    day_of_week: str
    start_time: str
    end_time: str
    room_name: Optional[str] = None
    batch_id: Optional[int] = None


class AdminTimeTableCreate(BaseModel):
    course_code: str
    batch_no: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_code: Optional[str] = None
    day_of_week: str
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"
    room_name: Optional[str] = None


class AdminTimeTableUpdate(BaseModel):
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room_name: Optional[str] = None
    batch_no: Optional[str] = None
    teacher_code: Optional[str] = None