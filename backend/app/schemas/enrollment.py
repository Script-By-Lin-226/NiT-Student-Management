from pydantic import BaseModel
from typing import Optional

class EnrollmentBase(BaseModel):
    enrollment_id: int
    enrollment_code: str
    student_id: int
    course_id: int
    enrollment_date: str
    status: bool


class AdminEnrollmentCreate(BaseModel):
    student_code: str
    course_code: str
    status: bool = True
    batch_no: Optional[str] = None
    payment_plan: Optional[str] = None
    downpayment: Optional[float] = None
    installment_amount: Optional[float] = None


class AdminEnrollmentUpdate(BaseModel):
    status: Optional[bool] = None
    batch_no: Optional[str] = None
    payment_plan: Optional[str] = None
    downpayment: Optional[float] = None
    installment_amount: Optional[float] = None
