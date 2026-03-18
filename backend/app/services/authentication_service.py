from app.security.jwt_tok import create_access_token, create_refresh_token
from app.models.model import User
from app.schemas.user import UserBase , LoginUser
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.responses import JSONResponse  
from fastapi import Request, HTTPException
from app.security.password_hashing import verify_password , hash_password
from app.security.rate_limiter import limiter

class AuthenticationService:

    async def register_user(user: UserBase, session:AsyncSession):
        #Query to check user existent
        
        query = select(User).where(User.email == user.email)
        result = await session.execute(query)
        existent_user = result.scalar_one_or_none()
        
        if existent_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        hashed = await hash_password(user.password)
        
        new_user = User(
            user_id = user.user_id,
            user_code=user.user_code,
            username=user.username,
            email=user.email,
            password_hash=hashed,
            data_of_birth=user.date_of_birth,
            role=user.role,
            nrc=user.nrc,
            gender=user.gender,
            address=user.address,
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        return new_user

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
            "role": existent_user.role
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