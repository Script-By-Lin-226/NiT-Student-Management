from pydantic import BaseModel , validator
from typing import Optional
from datetime import date

class UserBase(BaseModel):
    user_id: int
    user_code: str
    username: str
    email: str
    password: str
    phone: str
    nrc: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    role: str
    is_active: Optional[bool] = True
    
    @validator('password')
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class LoginUser(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminStudentCreate(BaseModel):
    username: str
    email: str
    password: str
    date_of_birth: date
    is_active: Optional[bool] = True
    
    # Contact info
    nrc: Optional[str] = None
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    address: Optional[str] = None
    
    # Optional enrollment
    course_code: Optional[str] = None
    batch_no: Optional[str] = None
    payment_plan: Optional[str] = None
    downpayment: Optional[float] = None
    installment_amount: Optional[float] = None

    @validator('password')
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class AdminParentCreate(BaseModel):
    username: str
    email: str
    password: str
    date_of_birth: date
    is_active: Optional[bool] = True

    @validator('password')
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class AdminParentLinkChild(BaseModel):
    student_code: str
    relationship_label: Optional[str] = "parent"
