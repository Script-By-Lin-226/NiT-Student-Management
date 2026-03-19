from app.services.authentication_service import AuthenticationService
from fastapi import APIRouter , Depends , HTTPException , Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database_initialization import get_db
from app.schemas.user import UserBase , LoginUser, StudentRegister

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
async def register_route(user: StudentRegister, session: AsyncSession = Depends(get_db)):
    return await AuthenticationService.register_user(user, session)

@router.post("/login")
async def login_route(request: Request, user: LoginUser, session: AsyncSession = Depends(get_db)):
    return await AuthenticationService.login(request, user, session)

@router.post("/logout")
async def logout_route(request: Request):
    return await AuthenticationService.logout(request)