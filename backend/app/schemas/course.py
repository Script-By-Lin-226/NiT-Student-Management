from pydantic import BaseModel
from typing import Optional

class CourseBase(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    academic_year_id: int
    user_id: int
    category: Optional[str] = None
    foc_items: Optional[str] = None  # Full Payment & Cash Down
    foc_items_installment: Optional[str] = None


class AdminCourseCreate(BaseModel):
    course_name: str
    academic_year_id: int
    instructor_user_code: Optional[str] = None  # teacher user_code (optional)
    fee_full_payment: Optional[float] = None
    fee_installment: Optional[float] = None
    exam_fee_gbp: Optional[float] = None
    foc_items: Optional[str] = None # Full & Cash Down
    foc_items_installment: Optional[str] = None
    category: Optional[str] = None


class AdminCourseUpdate(BaseModel):
    course_name: Optional[str] = None
    academic_year_id: Optional[int] = None
    instructor_user_code: Optional[str] = None
    fee_full_payment: Optional[float] = None
    fee_installment: Optional[float] = None
    exam_fee_gbp: Optional[float] = None
    foc_items: Optional[str] = None # Full & Cash Down
    foc_items_installment: Optional[str] = None
    category: Optional[str] = None