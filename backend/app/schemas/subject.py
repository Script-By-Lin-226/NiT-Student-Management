from pydantic import BaseModel
from typing import Optional

class SubjectBase(BaseModel):
    subject_code: str
    subject_name: str
    course_id: int
    is_active: Optional[bool] = True

class AdminSubjectCreate(BaseModel):
    subject_code: str
    subject_name: str
    course_id: int
    is_active: Optional[bool] = True

class AdminSubjectUpdate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    is_active: Optional[bool] = None
