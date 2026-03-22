from app.security.jwt_tok import create_access_token, create_refresh_token
from app.models.model import User
from app.schemas.user import UserBase, LoginUser, StudentRegister
from app.services.admin_panel import _next_student_code
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.responses import JSONResponse  
from fastapi import Request, HTTPException
from app.security.password_hashing import verify_password , hash_password
from app.security.rate_limiter import limiter
from app.core.config import settings
from app.repositories.token_repository import TokenRepository
from app.core.database_initialization import AsyncSessionLocal
from datetime import datetime, timedelta, timezone

class AuthenticationService:

    @staticmethod
    async def register_user(user: StudentRegister, session: AsyncSession):
        from datetime import datetime, time
        
        query = select(User).where(User.email == user.email)
        result = await session.execute(query)
        existent_user = result.scalar_one_or_none()
        
        if existent_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        hashed = await hash_password(user.phone) 
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
            how_did_you_hear=user.how_did_you_hear,
            student_type=user.student_type,
            is_active=True
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        return JSONResponse({"status_code": 201, "message": "Student registered successfully", "data": {"user_code": new_user.user_code, "username": new_user.username}})

    @staticmethod
    @limiter.limit("5/minute")
    async def login(request: Request, user: LoginUser, session: AsyncSession):
        query = select(User).where(User.email == user.email)
        result = await session.execute(query)
        existent_user = result.scalar_one_or_none()
        
        if not existent_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        try:
            password_valid = await verify_password(user.password, existent_user.password_hash)
        except Exception:
            raise HTTPException(status_code=500, detail="Password verification error. Please contact support.")
        
        if not password_valid:
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
        
        # Save refresh token in DB
        refresh_token_expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await TokenRepository.create_token(
            session=session,
            user_id=existent_user.user_id,
            token=refresh_token,
            expires_at=refresh_token_expires_at
        )

        response = JSONResponse({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_code": existent_user.user_code,
            "role": existent_user.role,
            "username": existent_user.username,
            "profile_picture": existent_user.profile_picture
        })
        
        is_production = not settings.FRONTEND_URL.startswith("http://localhost")
        cookie_secure = is_production
        cookie_samesite = "none" if is_production else "lax"
        
        response.set_cookie("access_token", access_token, httponly=True, secure=cookie_secure, samesite=cookie_samesite)
        response.set_cookie("refresh_token", refresh_token, httponly=True, secure=cookie_secure, samesite=cookie_samesite)
        response.headers["Authorization"] = f"Bearer {access_token}"
        
        return response   

    @staticmethod
    async def rotate_token(refresh_token_str: str):
        from app.security.jwt_tok import decode_token, create_access_token, create_refresh_token
        from app.models.model import User
        
        async with AsyncSessionLocal() as session:
            try:
                payload = await decode_token(refresh_token_str)
                if payload.get("type") != "refresh":
                    raise HTTPException(status_code=401, detail="Invalid token type")
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid refresh token")

            token_record = await TokenRepository.get_token(session, refresh_token_str)
            
            if not token_record or token_record.is_revoked:
                if token_record:
                    await TokenRepository.revoke_all_user_tokens(session, token_record.user_id)
                raise HTTPException(status_code=401, detail="Token has been revoked or reused")
            
            if token_record.expires_at < datetime.utcnow():
                raise HTTPException(status_code=401, detail="Refresh token expired")

            user_query = select(User).where(User.user_id == token_record.user_id)
            result = await session.execute(user_query)
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=401, detail="User not found")

            new_access_token = await create_access_token(data={
                "sub": str(user.user_code).lower(),
                "role": user.role,
                "user_code": user.user_code,
            })
            new_refresh_token = await create_refresh_token(data={
                "sub": str(user.user_code).lower(),
                "role": user.role,
            })

            await TokenRepository.revoke_token(session, token_record.id)
            new_expires_at = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            await TokenRepository.create_token(session, user.user_id, new_refresh_token, new_expires_at)

            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "payload": {
                    "sub": str(user.user_code).lower(),
                    "role": user.role,
                    "user_code": user.user_code,
                }
            }
    
    @staticmethod
    async def logout(request: Request):
        user = getattr(request.state, "user", None)
        if not user:
            return JSONResponse({"message": "User not found"}, status_code=404)
        
        refresh_token = request.cookies.get("refresh_token")
        if refresh_token:
            async with AsyncSessionLocal() as session:
                token_record = await TokenRepository.get_token(session, refresh_token)
                if token_record:
                    await TokenRepository.revoke_token(session, token_record.id)

        response = JSONResponse({"message": "User logged out successfully"})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response