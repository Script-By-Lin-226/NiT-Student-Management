from app.security.jwt_tok import decode_token, create_access_token
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from datetime import datetime


EXCLUDE_PATH = ["/auth/login" , "/auth/register" , "/auth/courses", "/docs" , "/openapi.json" , "/redoc" , "/favicon.ico", "/register" , "/health"]


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        from app.services.authentication_service import AuthenticationService
        from app.core.config import settings

        # Skip public routes
        if request.method == "OPTIONS":
            return await call_next(request)
        
        if request.url.path in EXCLUDE_PATH:
            return await call_next(request)

        # Get access token
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.cookies.get("access_token")

        payload = None
        new_tokens = None

        if token:
            try:
                payload = await decode_token(token)
                
                # Verify active status via cache (Fast Transaction)
                from app.core.cache import cache_manager
                user_code = payload.get("user_code")
                if user_code:
                    cache_key = f"user:{str(user_code).lower()}"
                    cached_user = await cache_manager.get(cache_key)
                    
                    if cached_user:
                        if not cached_user.get("is_active"):
                            return JSONResponse(status_code=403, content={"detail": "Account deactivated"})
                    else:
                        # Cache miss: Verify in DB once and re-cache
                        from app.core.database_initialization import AsyncSessionLocal
                        from sqlalchemy.future import select
                        from app.models.model import User
                        async with AsyncSessionLocal() as session:
                            res = await session.execute(select(User).where(User.user_code == user_code))
                            db_user = res.scalar_one_or_none()
                            if db_user:
                                if not db_user.is_active:
                                    return JSONResponse(status_code=403, content={"detail": "Account deactivated"})
                                # Re-populate cache
                                await cache_manager.set(cache_key, {
                                    "is_active": db_user.is_active,
                                    "role": db_user.role
                                }, expire=3600)
                
                request.state.user = payload
            except JWTError:
                # Token expired or invalid, try rotation
                payload = None

        # If no valid access token payload, try to rotate using refresh token
        if not payload:
            refresh_token = request.cookies.get("refresh_token")
            if refresh_token:
                try:
                    new_tokens = await AuthenticationService.rotate_token(refresh_token)
                    payload = new_tokens["payload"]
                    request.state.user = payload
                except Exception:
                    # Refresh token also invalid or expired
                    return JSONResponse(status_code=401, content={"detail": "Session expired"})
            else:
                return JSONResponse(status_code=401, content={"detail": "Missing or invalid token"})

        response = await call_next(request)

        # If we rotated, or if access token is about to expire, update tokens in response
        if new_tokens:
            self._set_token_cookies(response, new_tokens["access_token"], new_tokens["refresh_token"])
            response.headers["x-new-token"] = new_tokens["access_token"]
        return response

    def _set_token_cookies(self, response, access_token, refresh_token):
        from app.core.config import settings
        is_production = not settings.FRONTEND_URL.startswith("http://localhost")
        cookie_secure = is_production
        cookie_samesite = "none" if is_production else "lax"
        
        response.set_cookie("access_token", access_token, httponly=True, secure=cookie_secure, samesite=cookie_samesite)
        response.set_cookie("refresh_token", refresh_token, httponly=True, secure=cookie_secure, samesite=cookie_samesite)

        # Ensure CORS exposes the header
        existing_expose = response.headers.get("Access-Control-Expose-Headers", "")
        if "x-new-token" not in existing_expose.lower():
            if existing_expose:
                response.headers["Access-Control-Expose-Headers"] = f"{existing_expose}, x-new-token"
            else:
                response.headers["Access-Control-Expose-Headers"] = "x-new-token"
