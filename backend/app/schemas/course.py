from pydantic import BaseModel
from typing import Optional

class CourseBase(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    academic_year_id: int
    user_id: int


class AdminCourseCreate(BaseModel):
    course_name: str
    academic_year_id: int
    instructor_user_code: Optional[str] = None  # teacher user_code (optional)
    start_date: Optional[str] = None
    room: Optional[str] = None
    cost: Optional[float] = None
    discount_plan: Optional[str] = None


class AdminCourseUpdate(BaseModel):
    course_name: Optional[str] = None
    academic_year_id: Optional[int] = None
    instructor_user_code: Optional[str] = None  # set/replace instructor
    start_date: Optional[str] = None
    room: Optional[str] = None
    cost: Optional[float] = None
    discount_plan: Optional[str] = None