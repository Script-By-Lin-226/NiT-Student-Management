from pydantic import BaseModel

class GradeBase(BaseModel):
    grade_id: int
    user_code: int
    course_code: int
    grade: str
    grade_point: float
