from app.services.authentication_service import AuthenticationService
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_initialization import get_db
from app.schemas.user import UserBase, LoginUser, StudentRegister
from app.models.model import Course

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register_route(user: StudentRegister, session: AsyncSession = Depends(get_db)):
    return await AuthenticationService.register_user(user, session)

@router.get("/courses")
async def get_courses_public(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(Course))
    courses = result.scalars().all()
    return JSONResponse({
        "status_code": 200,
        "message": "Courses fetched successfully",
        "data": [{"course_id": c.course_id, "course_code": c.course_code, "course_name": c.course_name, "category": c.category} for c in courses]
    })

@router.post("/login")
async def login_route(request: Request, user: LoginUser, session: AsyncSession = Depends(get_db)):
    return await AuthenticationService.login(request, user, session)

@router.get("/me")
async def get_me_route(request: Request, session: AsyncSession = Depends(get_db)):
    return await AuthenticationService.get_me(request, session)

@router.put("/profile/update")
async def update_profile_route(request: Request, payload: dict, session: AsyncSession = Depends(get_db)):
    return await AuthenticationService.update_profile(request, payload, session)

@router.post("/logout")
async def logout_route(request: Request):
    return await AuthenticationService.logout(request)
