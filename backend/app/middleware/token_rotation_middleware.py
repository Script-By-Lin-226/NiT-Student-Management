from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from app.security.jwt_tok import decode_token
from app.services.authentication_service import AuthenticationService
from app.core.config import settings

class TokenRotationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip public routes and OPTIONS
        EXCLUDE_PATH = ["/auth/login", "/auth/register", "/auth/courses", "/docs", "/openapi.json", "/redoc", "/favicon.ico", "/register", "/health"]
        if request.method == "OPTIONS" or request.url.path in EXCLUDE_PATH:
            return await call_next(request)

        # 1. Identify current access token
        auth_header = request.headers.get("Authorization")
        token = None
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.cookies.get("access_token")

        new_tokens = None
        
        # 2. Check for proactive rotation
        if token:
            try:
                payload = await decode_token(token)
                exp = payload.get("exp")
                if exp:
                    exp_time = datetime.fromtimestamp(exp, tz=timezone.utc)
                    now = datetime.now(tz=timezone.utc)
                    
                    # If token expires in less than 5 minutes, rotate proactively
                    if (exp_time - now).total_seconds() < 300:
                        refresh_token = request.cookies.get("refresh_token")
                        if refresh_token:
                            try:
                                new_tokens = await AuthenticationService.rotate_token(refresh_token)
                            except:
                                # If rotation fails, we don't block the request here, 
                                # we let AuthMiddleware handle the potential expiry
                                pass
            except JWTError:
                # Token already expired, AuthMiddleware will handle it using refresh token
                pass

        response = await call_next(request)

        # 3. If rotation occurred, set new cookies
        if new_tokens:
            self._set_token_cookies(response, new_tokens["access_token"], new_tokens["refresh_token"])
            response.headers["x-new-token"] = new_tokens["access_token"]
            
        return response

    def _set_token_cookies(self, response, access_token, refresh_token):
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
