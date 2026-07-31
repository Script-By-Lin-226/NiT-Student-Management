from app.security.jwt_tok import create_access_token, create_refresh_token
from app.models.model import User, Course, Enrollment
from app.schemas.user import UserBase, LoginUser, StudentRegister
from app.services.admin_panel import _next_student_code, _next_enrollment_code
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
from app.core.cache import cache_manager

class AuthenticationService:

    @staticmethod
    async def register_user(user: StudentRegister, session: AsyncSession):
        from datetime import datetime, time
        
        query = select(User).where(User.email == user.email)
        result = await session.execute(query)
        existent_user = result.scalar_one_or_none()
        
        if existent_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        raw_password = getattr(user, 'password', None) or user.phone
        hashed_password = await hash_password(raw_password)
        user_code = await _next_student_code(session, getattr(user, "department", "College"))
        
        dob_dt = None
        if user.date_of_birth:
             dob_dt = datetime.combine(user.date_of_birth, time.min)
        
        new_user = User(
            user_code=user_code,
            username=user.username,
            email=user.email,
            password_hash=hashed_password,
            data_of_birth=dob_dt,
            phone=user.phone,
            nrc=user.nrc,
            gender=user.gender,
            address=user.address,
            parent_name=user.parent_name,
            parent_phone=user.parent_phone,
            profile_picture=user.profile_picture,
            signature=user.signature,
            role="student",
            is_active=False,
            how_did_you_hear=user.how_did_you_hear,
            student_type=user.student_type,
            intended_course_code=user.course_code
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
            
        if not existent_user.is_active:
            raise HTTPException(status_code=403, detail="Account is inactive")
        
        try:
            password_valid = await verify_password(user.password, existent_user.password_hash)
        except Exception:
            raise HTTPException(status_code=500, detail="Password verification error. Please contact support.")
        
        if not password_valid:
            raise HTTPException(status_code=401, detail="Invalid password")
        
        access_token = create_access_token(data={
            "sub": str(existent_user.user_code).lower(),
            "role": existent_user.role,
            "user_code": existent_user.user_code,
        })
        refresh_token = create_refresh_token(data={
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

        # Cache user info for subsequent fast access
        user_cache_data = {
            "user_id": existent_user.user_id,
            "user_code": existent_user.user_code,
            "username": existent_user.username,
            "role": existent_user.role,
            "email": existent_user.email,
            "is_active": existent_user.is_active,
            "profile_picture": existent_user.profile_picture
        }
        await cache_manager.set(f"user:{existent_user.user_code.lower()}", user_cache_data, expire=3600)

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
        
        cookie_params = {
            "httponly": True,
            "secure": cookie_secure,
            "samesite": cookie_samesite
        }
        
        if user.remember_me:
            # Persistent cookies if remember me is on
            max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
            cookie_params["max_age"] = max_age

        response.set_cookie("access_token", access_token, **cookie_params)
        response.set_cookie("refresh_token", refresh_token, **cookie_params)
        response.headers["Authorization"] = f"Bearer {access_token}"
        
        return response   

    @staticmethod
    async def rotate_token(refresh_token_str: str):
        from app.security.jwt_tok import decode_token, create_access_token, create_refresh_token
        from app.models.model import User
        
        async with AsyncSessionLocal() as session:
            try:
                payload = decode_token(refresh_token_str)
                if payload.get("type") != "refresh":
                    raise HTTPException(status_code=401, detail="Invalid token type")
            except Exception:
                raise HTTPException(status_code=401, detail="Invalid refresh token")

            token_record = await TokenRepository.get_token(session, refresh_token_str)
            
            if not token_record or token_record.is_revoked:
                # REUSE LEATHWAY: If token was revoked within the last 10 SECONDS, 
                # do not trigger the "revoke all" security measure to avoid race conditions.
                leeway = 10
                if token_record and token_record.revoked_at:
                    elapsed = (datetime.utcnow() - token_record.revoked_at).total_seconds()
                    if elapsed < leeway:
                        # Log warning but allow request (will still likely fail 401 later since we can't easily retrieve the "new" tokens from this request)
                        # Actually, we should just raise a softer 401 or wait.
                        # For now, let's just avoid the global revocation.
                        raise HTTPException(status_code=401, detail="Token recently rotated. Please try again.")
                
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
            
            if not user.is_active:
                raise HTTPException(status_code=403, detail="Account is inactive")

            new_access_token = create_access_token(data={
                "sub": str(user.user_code).lower(),
                "role": user.role,
                "user_code": user.user_code,
            })
            new_refresh_token = create_refresh_token(data={
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
    async def get_me(request: Request, session: AsyncSession):
        user_data = getattr(request.state, "user", None)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_code = user_data.get("user_code")
        
        # Try cache first
        cache_key = f"me:{user_code.lower()}"
        cached = await cache_manager.get(cache_key)
        if cached is not None:
            return cached
        
        query = select(User).where(User.user_code == user_code)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account is inactive")
        
        profile = {
            "user_id": user.user_id,
            "user_code": user.user_code,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "profile_picture": user.profile_picture,
            "phone": user.phone,
            "nrc": user.nrc,
            "gender": user.gender,
            "address": user.address,
            "parent_name": user.parent_name,
            "parent_phone": user.parent_phone,
            "data_of_birth": user.data_of_birth.isoformat() if user.data_of_birth else None,
        }
        await cache_manager.set(cache_key, profile, expire=300)  # 5 min TTL
        return profile

    @staticmethod
    async def update_profile(request: Request, payload: dict, session: AsyncSession):
        user_data = getattr(request.state, "user", None)
        if not user_data:
            raise HTTPException(status_code=401, detail="Unauthorized")
            
        user_code = user_data.get("user_code")
        query = select(User).where(User.user_code == user_code)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if "username" in payload: user.username = payload["username"]
        if "email" in payload: user.email = payload["email"]
        if "phone" in payload: user.phone = payload["phone"]
        if "profile_picture" in payload: user.profile_picture = payload["profile_picture"]
        if "address" in payload: user.address = payload["address"]
        
        await session.commit()
        await session.refresh(user)
        
        # Invalidate both user session cache and get_me profile cache
        await cache_manager.delete(f"user:{user.user_code.lower()}")
        await cache_manager.delete(f"me:{user.user_code.lower()}")
        
        return {"message": "Profile updated successfully"}

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

    @staticmethod
    async def get_esign_student(user_code: str, session: AsyncSession):
        query = select(User).where(User.user_code == user_code)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")
        return {
            "user_code": user.user_code,
            "username": user.username,
            "signature": user.signature
        }

    @staticmethod
    async def update_esign_signature(user_code: str, signature: str, session: AsyncSession):
        query = select(User).where(User.user_code == user_code)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")
        user.signature = signature
        await session.commit()
        
        # Clear cache for this user
        from app.core.cache import cache_manager
        await cache_manager.delete(f"user:{user.user_code.lower()}")
        return {"message": "Signature submitted successfully"}