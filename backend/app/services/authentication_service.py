from app.security.jwt_tok import create_access_token, create_refresh_token
from app.models.model import User
from app.schemas.user import UserBase, LoginUser, StudentRegister
from app.services.admin_panel import _next_student_code
# from datetime import datetime, time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.responses import JSONResponse  
from fastapi import Request, HTTPException
from app.security.password_hashing import verify_password , hash_password
from app.security.rate_limiter import limiter

class AuthenticationService:

    async def register_user(user: StudentRegister, session:AsyncSession):
        #Query to check user existent
        from datetime import datetime, time
        
        query = select(User).where(User.email == user.email)
        result = await session.execute(query)
        existent_user = result.scalar_one_or_none()
        
        if existent_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Use a default password since students won't provide one on registration page
        hashed = await hash_password(user.phone) # Using phone number as default password
        user_code = await _next_student_code(session, getattr(user, "department", "College"))
        dob_dt = datetime.combine(user.date_of_birth, time.min)
        
        new_user = User(
            user_code=user_code,
            username=user.username,
            email=user.email,
            password_hash=hashed,
            data_of_birth=dob_dt,
            role="student",
            nrc=user.nrc,
            parent_name=user.parent_name,
            parent_phone=user.parent_phone,
            phone=user.phone,
            address=user.address,
            profile_picture=user.profile_picture,
            is_active=True
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        return JSONResponse({"status_code": 201, "message": "Student registered successfully", "data": {"user_code": new_user.user_code, "username": new_user.username}})

    @limiter.limit("5/minute")
    async def login(request: Request, user: LoginUser, session:AsyncSession):
        query = select(User).where(User.email == user.email)
        result = await session.execute(query)
        existent_user = result.scalar_one_or_none()
        
        if not existent_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not await verify_password(user.password, existent_user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password")
        
        access_token = await create_access_token(data={
            "sub": str(existent_user.user_code).lower(),
            "role": existent_user.role,
            "user_code": existent_user.user_code,
        })
        refresh_token = await create_refresh_token(data={
            "sub": str(existent_user.user_code).lower(),
            "role": existent_user.role,
        })
        
        response = JSONResponse({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_code": existent_user.user_code,
            "role": existent_user.role,
            "username": existent_user.username,
            "profile_picture": existent_user.profile_picture
        })
        
        response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax")
        response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax")
        response.headers["Authorization"] = f"Bearer {access_token}"
        
        return response   
    
    async def logout(request :Request):
        user = getattr(request.state , "user" , None)
        
        if not user:
            return JSONResponse(    {
                "message": "User not found"
            } , status_code=404)
        
        response = JSONResponse({
            "message": "User logged out successfully"
        })
        
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        
        return response   