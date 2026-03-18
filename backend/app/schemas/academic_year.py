from pydantic import BaseModel
from typing import Optional

class AcademicYearBase(BaseModel):
    academic_year_id: int
    academic_year_name: str
    start_date: str
    end_date: str


class AdminAcademicYearCreate(BaseModel):
    academic_year_name: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD


class AdminAcademicYearUpdate(BaseModel):
    academic_year_name: Optional[str] = None
    start_date: Optional[str] = None  # YYYY-MM-DD
    end_date: Optional[str] = None    # YYYY-MM-DD