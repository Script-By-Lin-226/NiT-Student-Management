from app.security.jwt_tok import decode_token, create_access_token
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from datetime import datetime


EXCLUDE_PATH = ["/auth/login" , "/auth/register" , "/docs" , "/openapi.json" , "/redoc" , "/favicon.ico", "/register"]


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):

        # Skip public routes
        if request.method == "OPTIONS":
            return await call_next(request)
        
        if request.url.path in EXCLUDE_PATH:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.cookies.get("access_token")

        if not token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid token"}
            )   

        try:
            payload = await decode_token(token)
            request.state.user = payload  # attach user info
        except JWTError:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid token"}
            )

        response = await call_next(request)

        # Token Rotation Logic
        try:
            exp = payload.get("exp")
            if exp:
                exp_time = datetime.utcfromtimestamp(exp)
                now = datetime.utcnow()
                # If token is expiring in less than 5 minutes, rotate it
                if (exp_time - now).total_seconds() < 300:
                    user_data = {k: v for k, v in payload.items() if k not in ("exp", "type")}
                    new_token = await create_access_token(user_data)
                    response.headers["x-new-token"] = new_token
                    
                    # Ensure CORS exposes the header
                    existing_expose = response.headers.get("Access-Control-Expose-Headers", "")
                    if "x-new-token" not in existing_expose.lower():
                        if existing_expose:
                            response.headers["Access-Control-Expose-Headers"] = f"{existing_expose}, x-new-token"
                        else:
                            response.headers["Access-Control-Expose-Headers"] = "x-new-token"
        except Exception:
            pass # Failsafe, don't break response if rotation fails

        return response