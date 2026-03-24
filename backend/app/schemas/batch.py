from pydantic import BaseModel
from typing import Optional, List
from datetime import date as date_type

class BatchBase(BaseModel):
    batch_no: str
    course_id: int
    start_date: Optional[date_type] = None
    end_date: Optional[date_type] = None
    room: Optional[str] = None
    instructor_id: Optional[int] = None
    is_active: bool = True

class AdminBatchCreate(BaseModel):
    batch_no: str
    course_id: int
    start_date: Optional[str] = None # YYYY-MM-DD
    end_date: Optional[str] = None
    room: Optional[str] = None
    instructor_user_code: Optional[str] = None

class AdminBatchUpdate(BaseModel):
    batch_no: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    room: Optional[str] = None
    instructor_user_code: Optional[str] = None
    is_active: Optional[bool] = None

class AdminBatchResponse(BaseModel):
    batch_id: int
    batch_no: str
    course_id: int
    course_name: Optional[str] = None
    start_date: Optional[date_type] = None
    end_date: Optional[date_type] = None
    room: Optional[str] = None
    instructor_name: Optional[str] = None
    instructor_code: Optional[str] = None
    is_active: bool
    
    class Config:
        from_attributes = True
